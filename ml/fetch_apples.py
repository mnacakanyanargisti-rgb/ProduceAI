"""Download and extract only apple images from a public Hugging Face dataset.

Run from the repository root:
  pip install datasets pillow
  python -m ml.fetch_apples --output data/apples
  python -m ml.split --data data/apples --source https://huggingface.co/datasets/menasi11/fruit-classification --license "Verify dataset license before redistribution"

No images are committed to GitHub. The upstream dataset has train/test splits,
but this project regenerates a new stratified split from the extracted apple
images; do not report the original provider's test performance as comparable.
"""
import argparse
import hashlib
import io
from pathlib import Path

from PIL import Image, ImageOps


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("data/apples"))
    parser.add_argument("--dataset", default="menasi11/fruit-classification")
    args = parser.parse_args()
    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise SystemExit("Install the dataset loader: pip install datasets") from exc
    counts = {"fresh": 0, "rotten": 0}
    seen = set()
    for split in ("train", "test"):
        rows = load_dataset(args.dataset, split=split)
        label_feature = rows.features.get("label")
        names = getattr(label_feature, "names", None)
        for row in rows:
            raw_label = row["label"]
            name = names[int(raw_label)] if names and isinstance(raw_label, int) else str(raw_label)
            name = name.lower().replace(" ", "_")
            if name not in {"fresh_apple", "rotten_apple"}:
                continue
            category = "fresh" if name == "fresh_apple" else "rotten"
            raw_image = row["image"]
            if isinstance(raw_image, Image.Image):
                image = raw_image
            elif isinstance(raw_image, dict) and raw_image.get("bytes"):
                image = Image.open(io.BytesIO(raw_image["bytes"]))
            else:
                raise ValueError("Unsupported image representation in dataset")
            with image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((1024, 1024))
                output = io.BytesIO()
                image.save(output, format="JPEG", quality=93)
            payload = output.getvalue()
            digest = hashlib.sha256(payload).hexdigest()
            if digest in seen:
                continue
            seen.add(digest)
            folder = args.output / category
            folder.mkdir(parents=True, exist_ok=True)
            (folder / (digest + ".jpg")).write_bytes(payload)
            counts[category] += 1
    if min(counts.values()) < 10:
        raise RuntimeError(f"Insufficient apple samples: {counts}; inspect upstream labels")
    print("Exported apple images:", counts)
    print("Next: python -m ml.split --data", args.output,
          '--source "https://huggingface.co/datasets/' + args.dataset + '"',
          '--license "Verify upstream terms"')


if __name__ == "__main__":
    main()
