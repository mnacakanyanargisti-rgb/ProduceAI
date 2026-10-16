"""Load trusted locally produced artifacts only. Never deserialize user uploads as models."""

import time
from pathlib import Path
import joblib
import numpy as np
import torch
from ml.models import LABELS, build_model, transform, features


# These are abstention decisions, not guarantees that every novel object is known.
# Do not tell the user a real apple is "not an apple" merely because the model
# falls short of 80% confidence. On ambiguous pictures request a new photograph.
NOT_APPLE_MIN_PROBABILITY = 0.65
APPLE_MAX_NONAPPLE_PROBABILITY = 0.50
MIN_APPLE_CLASS_PROBABILITY = 0.45
UNCERTAIN_LABEL = "Unable to Verify"


def classify_probabilities(probabilities):
    if len(probabilities) != len(LABELS) or not np.isfinite(probabilities).all():
        raise ValueError("Invalid model output")
    best_apple = int(np.argmax(probabilities[:2]))
    best_apple_probability = float(probabilities[best_apple])
    nonapple = float(probabilities[2])
    if nonapple >= NOT_APPLE_MIN_PROBABILITY and nonapple > best_apple_probability:
        return LABELS[2]
    if (best_apple_probability >= MIN_APPLE_CLASS_PROBABILITY and
            nonapple <= APPLE_MAX_NONAPPLE_PROBABILITY):
        return LABELS[best_apple]
    return UNCERTAIN_LABEL


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
