"""Download independently captured orchard apple photographs for generalization.

Source: Mustafa Mhamed et al., AFQC academic-only dataset
https://github.com/mustafa20999/AFQC
Original Train and Test directories remain separate. Test photos are never
added to the training data or used for threshold selection.
"""
import argparse
import concurrent.futures
import hashlib
import io
import json
import random
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

REPOSITORY = "mustafa20999/AFQC"
BRANCH = "main"


def fetch(url, attempts=4):
    for retry in range(attempts):
        try:
            with urlopen(Request(url, headers={"User-Agent": "ProduceAI-academic-research/2.0"}), timeout=50) as res:
                return res.read()
        except Exception:
            if retry + 1 == attempts:
                raise
            time.sleep(1.2 * (retry + 1))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("data/apples"))
    parser.add_argument("--external-test", type=Path, default=Path("data/orchard_test"))
    parser.add_argument("--train-per-class", type=int, default=350)
    parser.add_argument("--test-per-class", type=int, default=90)
    parser.add_argument("--workers", type=int, default=12)
    parser.add_argument("--seed", type=int, default=2026)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    hashes_by_partition = {"Train": set(), "Test": set()}
    for partition, quota, output in (
        ("Train", args.train_per_class, args.output),
        ("Test", args.test_per_class, args.external_test),
    ):
        for category, upstream in (("fresh", "apple_fresh"), ("rotten", "apple_rotten")):
            folder = f"{partition}/{upstream}"
            api = f"https://api.github.com/repos/{REPOSITORY}/contents/{folder}?ref={BRANCH}"
            entries = json.loads(fetch(api))
            if not isinstance(entries, list):
                raise ValueError(f"Unexpected upstream listing: {folder}")
            entries = [entry for entry in entries
                       if entry.get("type") == "file" and
                       entry["name"].lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
            if len(entries) < quota:
                raise ValueError(f"Insufficient {partition}/{upstream} images: {len(entries)} < {quota}")
            # Image repositories may contain duplicate bytes under different filenames.
            # Draw extra candidates, then keep only truly distinct images.
            shuffled = rng.sample(entries, len(entries))
            destination = output / category
            destination.mkdir(parents=True, exist_ok=True)

            def load(entry):
                url = f"https://raw.githubusercontent.com/{REPOSITORY}/{BRANCH}/{quote(entry['path'], safe='/')}"
                blob = fetch(url)
                with Image.open(io.BytesIO(blob)) as original:
                    photo = ImageOps.exif_transpose(original).convert("RGB")
                    photo.thumbnail((900, 900))
                    buff = io.BytesIO()
                    photo.save(buff, format="JPEG", quality=91)
                data = buff.getvalue()
                return hashlib.sha256(data).hexdigest(), data

            unique = {}
            # Download at most a quota plus a limited replacement buffer initially.
            # If many duplicates exist, continue with the remaining candidates.
            for offset in range(0, len(shuffled), 40):
                batch = shuffled[offset:offset + 40]
                with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
                    for digest, data in pool.map(load, batch):
                        if digest not in unique and digest not in hashes_by_partition[partition]:
                            unique[digest] = data
                if len(unique) >= quota:
                    break
            if len(unique) < quota:
                raise ValueError(f"Only {len(unique)} unique images in {folder}; need {quota}")
            selected_unique = list(unique.items())[:quota]
            for digest, data in selected_unique:
                (destination / f"orchard__{digest}.jpg").write_bytes(data)
            new_hashes = {digest for digest, _ in selected_unique}
            if hashes_by_partition[partition] & new_hashes:
                raise ValueError(f"Duplicate between classes inside {partition}")
            hashes_by_partition[partition].update(new_hashes)
            print(f"{partition} orchard {category}: {len(new_hashes)} unique", flush=True)
    if hashes_by_partition["Train"] & hashes_by_partition["Test"]:
        raise ValueError("Orchard test leaks into training set")
    (args.external_test / "provenance.json").write_text(json.dumps({
        "source": f"https://github.com/{REPOSITORY}",
        "license": "Academic-only per upstream README. Do not commercialize without permission.",
        "split": "Upstream AFQC Test; completely separate from Train",
        "seed": args.seed,
        "per_class": args.test_per_class,
    }, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
