"""Curated hard negatives for open-set apple verification.

All source classes are explicitly NOT apples. Include candy packets, cigarettes,
other grocery products, and other fruits, so the model need not always predict
fresh or rotten apple.

Original dataset licenses are not established; research/demo use only.
Review rights and re-sample in-capture orchard data before commercial use.
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

# Source repositories are public and are downloaded at training time, never by users.
SOURCES = [
    # (display_group, repository, branch, folder, max_items)
    ("cigarette", "LoaferCH/dataset_classification_cigarettes", "master", "cigs", 90),
    ("cigarette_other", "LoaferCH/dataset_classification_cigarettes", "master", "other", 35),
    ("candy", "PerceptiLabs/Recognizing-Groceries", "master", "data/CANDY", 80),
    ("chocolate", "PerceptiLabs/Recognizing-Groceries", "master", "data/CHOCOLATE", 35),
    ("cake", "PerceptiLabs/Recognizing-Groceries", "master", "data/CAKE", 30),
    ("soda", "PerceptiLabs/Recognizing-Groceries", "master", "data/SODA", 30),
    ("banana", "Bangkit-JKT2-D/fruits-fresh-rotten-classification", "master", "Datasets/train/freshbanana", 60),
    ("orange", "Bangkit-JKT2-D/fruits-fresh-rotten-classification", "master", "Datasets/train/freshoranges", 60),
]


def download(url, retries=4):
    headers = {"User-Agent": "ProduceAI-research/1.1", "Accept": "application/vnd.github+json"}
    for attempt in range(retries):
        try:
            with urlopen(Request(url, headers=headers), timeout=45) as response:
                return response.read()
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 * (attempt + 1))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("data/apples"))
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--seed", type=int, default=1729)
    args = parser.parse_args()
    output_dir = args.output / "not_apple"
    output_dir.mkdir(parents=True, exist_ok=True)
    rng = random.Random(args.seed)
    totals = {}
    overall_digests = set()

    for group, repo, branch, folder, wanted in SOURCES:
        api = f"https://api.github.com/repos/{repo}/contents/{quote(folder, safe='/')}?ref={branch}"
        rows = json.loads(download(api))
        if not isinstance(rows, list):
            raise RuntimeError(f"Expected GitHub directory listing for {group}")
        images = [
            item for item in rows
            if item.get("type") == "file" and
            item["name"].lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
        ]
        if len(images) < wanted:
            raise RuntimeError(f"Only {len(images)} images in {repo}/{folder}; need {wanted}")
        # A fixed random subset limits selecting neighboring video frames or
        # monotonically ordered collection bursts.
        chosen = sorted(rng.sample(images, wanted), key=lambda entry: entry["path"])

        def ingest(item):
            path = quote(item["path"], safe="/")
            url = f"https://raw.githubusercontent.com/{repo}/{branch}/{path}"
            data = download(url)
            with Image.open(io.BytesIO(data)) as source:
                image = ImageOps.exif_transpose(source).convert("RGB")
                image.thumbnail((800, 800))
                buffer = io.BytesIO()
                image.save(buffer, format="JPEG", quality=90)
            payload = buffer.getvalue()
            digest = hashlib.sha256(payload).hexdigest()
            destination = output_dir / f"{group}__{digest}.jpg"
            destination.write_bytes(payload)
            return digest

        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            hashes = list(pool.map(ingest, chosen))
        unique = set(hashes)
        if len(unique) < wanted * 0.75:
            raise ValueError(f"Too many duplicates in {group}: {len(unique)} of {wanted}")
        if unique & overall_digests:
            raise ValueError(f"Cross-group image duplicates in {group}")
        overall_digests |= unique
        totals[group] = len(unique)
        print(f"not-apple group {group}: {len(unique)}", flush=True)

    print("Non-apple image counts:", json.dumps(totals, sort_keys=True), flush=True)
    if not all(totals.get(group, 0) >= 20 for group in ("cigarette", "candy", "banana", "orange")):
        raise RuntimeError("Missing required hard-negative sources")


if __name__ == "__main__":
    main()
