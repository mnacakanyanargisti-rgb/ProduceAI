"""Generate an auditable dataset overview from the split manifest."""

import argparse
import json
from pathlib import Path
import pandas as pd
from PIL import Image


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", type=Path, default=Path("data/manifest.csv"))
    p.add_argument("--output", type=Path, default=Path("experiments/eda.json"))
    a = p.parse_args()
    frame = pd.read_csv(a.manifest)
    widths = []
    heights = []
    for path in frame.path:
        with Image.open(path) as image:
            widths.append(image.width)
            heights.append(image.height)
    report = {
        "total_images": len(frame),
        "duplicate_hashes": int(frame.sha256.duplicated().sum()),
        "class_counts": {str(k): int(v) for k, v in frame.label.value_counts().items()},
        "split_counts": frame.groupby(["split", "label"])
        .size()
        .reset_index(name="count")
        .to_dict(orient="records"),
        "width_summary": pd.Series(widths).describe().to_dict(),
        "height_summary": pd.Series(heights).describe().to_dict(),
        "remaining_manual_audit": [
            "label correctness",
            "near duplicates",
            "same-fruit/capture groups",
            "cultivar diversity",
            "lighting and background shortcuts",
            "license and collection provenance",
        ],
    }
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
