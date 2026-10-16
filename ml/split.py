"""Create a provenance-bearing stratified manifest; never move the original dataset."""

import argparse
import hashlib
import json
from pathlib import Path
import pandas as pd
from PIL import Image
from sklearn.model_selection import train_test_split


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data", type=Path, required=True)
    p.add_argument("--source", required=True, help="Dataset source URL or identifier")
    p.add_argument("--license", required=True)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--output", type=Path, default=Path("data/manifest.csv"))
    a = p.parse_args()
    rows = []
    seen = set()
    for label, folder in enumerate(["fresh", "rotten", "not_apple"]):
        for path in sorted((a.data / folder).rglob("*")):
            if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest in seen:
                raise ValueError(
                    f"Duplicate image found: {path}. Remove duplicates before splitting."
                )
            seen.add(digest)
            with Image.open(path) as image:
                image.verify()
            rows.append(
                {"path": path.resolve().as_posix(), "label": label, "sha256": digest,
                 "source_group": path.name.split("__", 1)[0] if label == 2 else folder}
            )
    df = pd.DataFrame(rows)
    if df.empty or set(df.label) != {0, 1, 2} or df.groupby("label").size().min() < 10:
        raise ValueError(
            "Provide at least ten unique images per class under fresh/, rotten/, and not_apple/."
        )
    # Stratify *within each negative-source group*, not merely "not_apple".
    # Otherwise rare source groups such as cake can have <3 held-out items,
    # and per-group rejection statistics cannot be trusted or even computed.
    df["stratum"] = df["source_group"]
    counts = df.groupby("stratum").size()
    if counts.min() < 25:
        raise ValueError(
            "Need at least 25 unique images per source group for audited test sets: "
            + counts.to_json()
        )
    train, rest = train_test_split(
        df, test_size=0.30, random_state=a.seed, stratify=df.stratum
    )
    val, test = train_test_split(
        rest, test_size=0.5, random_state=a.seed, stratify=rest.stratum
    )
    for subset, name in ((train, "train"), (val, "val"), (test, "test")):
        small = subset.groupby("stratum").size()
        if small.min() < 3:
            raise ValueError(f"Insufficient {name} samples in source group: {small.to_json()}")
    train = train.drop(columns=["stratum"])
    val = val.drop(columns=["stratum"])
    test = test.drop(columns=["stratum"])
    result = pd.concat(
        [
            train.assign(split="train"),
            val.assign(split="val"),
            test.assign(split="test"),
        ]
    )
    a.output.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(a.output, index=False)
    metadata = {
        "source": a.source,
        "license": a.license,
        "seed": a.seed,
        "labels": ["Fresh Apple", "Rotten or Defective Apple", "Not an Apple"],
        "counts": result.groupby(["split", "label"])
        .size()
        .reset_index(name="count")
        .to_dict(orient="records"),
        "manifest_sha256": hashlib.sha256(a.output.read_bytes()).hexdigest(),
        "warning": "Byte duplicates checked. Audit near duplicates and capture groups before claiming unbiased evaluation.",
    }
    a.output.with_suffix(".json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    print(result.groupby(["split", "label"]).size())


if __name__ == "__main__":
    main()
