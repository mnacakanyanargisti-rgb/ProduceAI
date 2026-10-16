import argparse
import hashlib
import json
import random
import platform
from importlib.metadata import version
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import torch
from PIL import Image, ImageOps
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from torch.utils.data import DataLoader, Dataset
from ml.models import LABELS, build_model, features, transform


class Apples(Dataset):
    def __init__(self, frame, training=False):
        self.frame = frame.reset_index(drop=True)
        self.transform = transform(training)

    def __len__(self):
        return len(self.frame)

    def __getitem__(self, i):
        row = self.frame.iloc[i]
        with Image.open(row.path) as image:
            return self.transform(ImageOps.exif_transpose(image).convert("RGB")), int(
                row.label
            )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", type=Path, default=Path("data/manifest.csv"))
    p.add_argument("--model", choices=["baseline", "cnn", "mobilenet"], required=True)
    p.add_argument("--epochs", type=int, default=15)
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--version", required=True)
    p.add_argument("--output", type=Path, default=Path("models"))
    a = p.parse_args()
    if a.epochs < 1 or a.batch_size < 1:
        p.error("Epochs and batch size must be positive.")
    random.seed(a.seed)
    np.random.seed(a.seed)
    torch.manual_seed(a.seed)
    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)
    df = pd.read_csv(a.manifest)
    if df.sha256.duplicated().any():
        raise ValueError("Manifest contains duplicate hashes.")
    provenance = json.loads(a.manifest.with_suffix(".json").read_text(encoding="utf-8"))
    digest = hashlib.sha256(a.manifest.read_bytes()).hexdigest()
    if provenance["manifest_sha256"] != digest:
        raise ValueError("Manifest changed after split generation.")
    # Validate image contents against the frozen manifest before every training run.
    for row in df.itertuples():
        if hashlib.sha256(Path(row.path).read_bytes()).hexdigest() != row.sha256:
            raise ValueError(f"Dataset image changed: {row.path}")
    a.output.mkdir(parents=True, exist_ok=True)
    metadata = {
        "name": a.model,
        "version": a.version,
        "labels": LABELS,
        "seed": a.seed,
        "dataset": provenance["source"],
        "manifest_sha256": digest,
        "history": [],
        "epochs_requested": a.epochs,
        "batch_size": a.batch_size,
        "preprocessing": "RGB 224x224; ImageNet normalization for neural models; HSV histogram + grayscale stats for baseline",
    }
    metadata["environment"] = {
        "python": platform.python_version(),
        "platform": platform.platform(),
        "packages": {
            name: version(name)
            for name in [
                "torch",
                "torchvision",
                "scikit-learn",
                "numpy",
                "pandas",
                "opencv-python-headless",
            ]
        },
    }
    train = df[df.split == "train"]
    val = df[df.split == "val"]
    if a.model == "baseline":
        x = []
        for path in train.path:
            with Image.open(path) as image:
                x.append(features(ImageOps.exif_transpose(image).convert("RGB")))
        model = make_pipeline(
            StandardScaler(),
            SVC(probability=True, class_weight="balanced", random_state=a.seed),
        )
        model.fit(x, train.label.to_numpy())
        joblib.dump({**metadata, "model": model}, a.output / "baseline.joblib")
    else:
        loaders = {
            name: DataLoader(
                Apples(frame, name == "train"),
                batch_size=a.batch_size,
                shuffle=name == "train",
                num_workers=0,
            )
            for name, frame in [("train", train), ("val", val)]
        }
        model = build_model(a.model, pretrained=a.model == "mobilenet")
        if a.model == "mobilenet":
            optimizer = torch.optim.Adam([
                {"params": model.classifier.parameters(), "lr": 4e-4},
                {"params": model.features[-2:].parameters(), "lr": 3e-5},
            ], weight_decay=1e-4)
        else:
            optimizer = torch.optim.Adam(
                filter(lambda p: p.requires_grad, model.parameters()), lr=0.001
            )
        loss_fn = torch.nn.CrossEntropyLoss()
        best = float("inf")
        for epoch in range(a.epochs):
            losses = {}
            for phase, loader in loaders.items():
                model.train(phase == "train")
                # Keep pretrained BatchNorm statistics frozen while training the new classifier.
                if a.model == "mobilenet":
                    model.features.eval()
                total = 0.0
                for x, y in loader:
                    with torch.set_grad_enabled(phase == "train"):
                        loss = loss_fn(model(x), y)
                        if phase == "train":
                            optimizer.zero_grad()
                            loss.backward()
                            optimizer.step()
                    total += loss.item() * len(y)
                losses[phase] = total / len(loader.dataset)
            metadata["history"].append(
                {
                    "epoch": epoch + 1,
                    "train_loss": losses["train"],
                    "val_loss": losses["val"],
                }
            )
            if losses["val"] < best:
                best = losses["val"]
                metadata["selected_epoch"] = epoch + 1
                torch.save(
                    {**metadata, "state_dict": model.state_dict()},
                    a.output / f"{a.model}.pt",
                )
            print(epoch + 1, losses)
        # Full history belongs alongside the selected checkpoint, not just its prefix.
    (a.output / f"{a.model}.metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
