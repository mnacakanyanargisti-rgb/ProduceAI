"""Load trusted locally produced artifacts only. Never deserialize user uploads as models."""

import time
from pathlib import Path
import joblib
import numpy as np
import torch
from ml.models import LABELS, build_model, transform, features


# Conservative open-set gate: a fresh/rotten probability is *not* enough
# until the model also has little evidence for the "not an apple" class.
MIN_APPLE_CONFIDENCE = 0.80
MAX_NONAPPLE_PROBABILITY = 0.15


def classify_probabilities(probabilities):
    if len(probabilities) != len(LABELS) or not np.isfinite(probabilities).all():
        raise ValueError("Invalid model output")
    best_apple = int(np.argmax(probabilities[:2]))
    if (probabilities[best_apple] < MIN_APPLE_CONFIDENCE or
            probabilities[2] > MAX_NONAPPLE_PROBABILITY):
        return LABELS[2]
    return LABELS[best_apple]


class Predictor:
    def __init__(self, path):
        path = Path(path)
        if path.suffix == ".joblib":
            data = joblib.load(path)  # trusted operator-controlled path only
            self.name, self.version = "baseline", data["version"]
            self.model = data["model"]
            self.labels = data["labels"]
            self.neural = False
        else:
            data = torch.load(path, map_location="cpu", weights_only=True)
            self.name, self.version, self.labels = (
                data["name"],
                data["version"],
                data["labels"],
            )
            self.model = build_model(self.name)
            self.model.load_state_dict(data["state_dict"])
            self.model.eval()
            self.neural = True
        if self.labels != LABELS or not isinstance(self.version, str):
            raise ValueError("Invalid checkpoint class order or version")

    def predict(self, image):
        start = time.perf_counter()
        if self.neural:
            with torch.inference_mode():
                probabilities = (
                    self.model(transform()(image).unsqueeze(0)).softmax(1)[0].numpy()
                )
        else:
            probabilities = self.model.predict_proba([features(image)])[0]
        duration = (time.perf_counter() - start) * 1000
        if len(probabilities) != len(LABELS) or not np.isfinite(probabilities).all():
            raise ValueError("Invalid model output")
        return {
            "label": classify_probabilities(probabilities),
            "probabilities": dict(zip(LABELS, map(float, probabilities))),
            "model_name": self.name,
            "model_version": self.version,
            "inference_ms": duration,
        }
