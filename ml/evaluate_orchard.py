"""Evaluate on untouched AFQC Test orchard images (never used for training).

A high internal test accuracy does not prove a camera photograph of an actual
apple will be accepted. Fail model publication if held-out orchard apple
acceptance is poor. This still does not certify phones in every environment.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

from ml.inference import Predictor
from ml.models import LABELS


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data/orchard_test"))
    parser.add_argument("--manifest", type=Path, default=Path("data/manifest.csv"))
    parser.add_argument("--checkpoint", type=Path, default=Path("models/mobilenet.pt"))
    parser.add_argument("--metrics", type=Path, default=Path("experiments/results.json"))
    args = parser.parse_args()

    provenance = json.loads((args.data / "provenance.json").read_text())
    if provenance.get("split") != "Upstream AFQC Test; completely separate from Train":
        raise RuntimeError("External orchard Test source was not verified")
    training_hashes = set()
    import pandas as pd
    for row in pd.read_csv(args.manifest).itertuples():
        training_hashes.add(row.sha256)
    predictor = Predictor(args.checkpoint)
    report = {}
    for name, expected in (("fresh", LABELS[0]), ("rotten", LABELS[1])):
        paths = sorted((args.data / name).glob("*.jpg"))
        if len(paths) < 40:
            raise RuntimeError(f"Not enough independent orchard {name} photos")
        accepted = 0
        correct = 0
        uncertain = 0
        not_apple = 0
        for photo in paths:
            if hashlib.sha256(photo.read_bytes()).hexdigest() in training_hashes:
                raise RuntimeError("External orchard photos overlap with training manifest")
            with Image.open(photo) as image:
                prediction = predictor.predict(ImageOps.exif_transpose(image).convert("RGB"))
            label = prediction["label"]
            accepted += int(label in LABELS[:2])
            correct += int(label == expected)
            uncertain += int(label == "Unable to Verify")
            not_apple += int(label == "Not an Apple")
        report[name] = {
            "samples": len(paths),
            "apple_acceptance": accepted / len(paths),
            "correct_quality_classification": correct / len(paths),
            "uncertain_count": uncertain,
            "false_not_apple_count": not_apple,
        }
    total = sum(item["samples"] for item in report.values())
    report["overall"] = {
        "samples": total,
        "apple_acceptance": sum(report[key]["apple_acceptance"] * report[key]["samples"] for key in ("fresh", "rotten")) / total,
        "correct_quality_classification": sum(report[key]["correct_quality_classification"] * report[key]["samples"] for key in ("fresh", "rotten")) / total,
        "source": "https://github.com/mustafa20999/AFQC (official upstream Test partition)",
    }
    data = json.loads(args.metrics.read_text())
    found = False
    for experiment in data["experiments"]:
        if experiment["name"] == predictor.name and experiment["version"] == predictor.version:
            experiment["external_orchard"] = report
            found = True
    if not found:
        raise RuntimeError("Matching experiment missing")
    args.metrics.write_text(json.dumps(data, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if any(report[group]["apple_acceptance"] < 0.80 for group in ("fresh", "rotten")):
        raise RuntimeError("The model is rejecting too many real orchard apples; do not publish it")
    if report["overall"]["apple_acceptance"] < 0.87:
        raise RuntimeError("Orchard apple acceptance below safe prototype deployment gate")


if __name__ == "__main__":
    main()
