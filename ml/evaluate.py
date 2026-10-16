import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd
from PIL import Image, ImageOps
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
)
from ml.inference import Predictor
from ml.models import LABELS


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", type=Path, default=Path("data/manifest.csv"))
    p.add_argument("--checkpoint", type=Path, required=True)
    p.add_argument("--output", type=Path, default=Path("experiments/results.json"))
    a = p.parse_args()
    metadata = json.loads(
        a.checkpoint.with_name(a.checkpoint.stem + ".metadata.json").read_text(
            encoding="utf-8"
        )
    )
    if (
        hashlib.sha256(a.manifest.read_bytes()).hexdigest()
        != metadata["manifest_sha256"]
    ):
        raise ValueError("Test manifest differs from training manifest.")
    test = pd.read_csv(a.manifest).query("split == 'test'")
    if test.empty:
        raise ValueError("No held-out test images.")
    predictor = Predictor(a.checkpoint)
    predictions = []
    durations = []
    # Warm up separately; measured latency includes preprocessing and CPU forward pass.
    with Image.open(test.iloc[0].path) as image:
        predictor.predict(ImageOps.exif_transpose(image).convert("RGB"))
    for row in test.itertuples():
        if hashlib.sha256(Path(row.path).read_bytes()).hexdigest() != row.sha256:
            raise ValueError("Test image changed.")
        with Image.open(row.path) as image:
            result = predictor.predict(ImageOps.exif_transpose(image).convert("RGB"))
        predictions.append(LABELS.index(result["label"]))
        durations.append(result["inference_ms"])
    precision, recall, f1, _ = precision_recall_fscore_support(
        test.label, predictions, labels=[0, 1], average="macro", zero_division=0
    )
    result = {
        k: metadata[k]
        for k in [
            "name",
            "version",
            "seed",
            "dataset",
            "manifest_sha256",
            "history",
            "environment",
        ]
    }
    result.update(
        accuracy=float(accuracy_score(test.label, predictions)),
        precision=float(precision),
        recall=float(recall),
        f1=float(f1),
        confusion_matrix=confusion_matrix(
            test.label, predictions, labels=[0, 1]
        ).tolist(),
        test_samples=len(test),
        inference_ms=float(np.mean(durations)),
        latency_method="CPU; preprocessing + prediction; warmup excluded",
    )
    a.output.parent.mkdir(parents=True, exist_ok=True)
    existing = (
        json.loads(a.output.read_text(encoding="utf-8"))
        if a.output.exists()
        else {"schema_version": 1, "experiments": []}
    )
    existing["experiments"] = [
        e for e in existing["experiments"] if e["name"] != result["name"]
    ] + [result]
    a.output.write_text(json.dumps(existing, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
