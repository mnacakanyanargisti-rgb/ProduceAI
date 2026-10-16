"""Download a balanced apple-only subset from a verified GitHub folder dataset.

Source: https://github.com/Bangkit-JKT2-D/fruits-fresh-rotten-classification
Upstream folders: Datasets/train/{freshapples,rottenapples}.
Only use for research; verify original Kaggle license before commercial reuse.
"""
import argparse
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

OWNER = "Bangkit-JKT2-D"
REPO = "fruits-fresh-rotten-classification"
BRANCH = "master"


def fetch(url):
    with urlopen(Request(url, headers={"User-Agent": "ProduceAI-research/1.0"}), timeout=35) as response:
        return response.read()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output", type=Path, default=Path("data/apples"))
    p.add_argument("--per-class", type=int, default=180)
    p.add_argument("--workers", type=int, default=12)
    args = p.parse_args()
    if args.per_class < 10:
        p.error("--per-class must be at least 10")
    counts = {}
    for category, folder in (("fresh", "freshapples"), ("rotten", "rottenapples")):
        api = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/Datasets/train/{folder}?ref={BRANCH}"
        entries = json.loads(fetch(api))
        images = sorted(
            (entry for entry in entries if entry["type"] == "file"
             and entry["name"].lower().endswith((".jpg", ".jpeg", ".png", ".webp"))),
            key=lambda item: item["path"],
        )[:args.per_class]
        if len(images) < 10:
            raise RuntimeError(f"Not enough {folder} images: {len(images)}")
        target = args.output / category
        target.mkdir(parents=True, exist_ok=True)

        def save(entry):
            raw_url = f"https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}/{quote(entry['path'])}"
            data = fetch(raw_url)
            with Image.open(io.BytesIO(data)) as image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((1024, 1024))
                buffer = io.BytesIO()
                image.save(buffer, format="JPEG", quality=92)
            payload = buffer.getvalue()
            digest = hashlib.sha256(payload).hexdigest()
            (target / f"{digest}.jpg").write_bytes(payload)
            return digest

        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            hashes = list(pool.map(save, images))
        counts[category] = len(set(hashes))
        print(category, counts[category], flush=True)
    if min(counts.values()) < 10:
        raise RuntimeError(f"Insufficient unique images: {counts}")
    print("Apple dataset ready:", counts, flush=True)


if __name__ == "__main__":
    main()
