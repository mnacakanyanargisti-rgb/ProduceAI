"""Shared architectures and preprocessing; class order is part of the model contract."""

import cv2
import numpy as np
import torch.nn as nn
from torchvision import models, transforms

LABELS = ["Fresh Apple", "Rotten or Defective Apple"]
NORMALIZE = transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])


def transform(training=False):
    steps = [transforms.Resize((224, 224))]
    if training:
        steps += [transforms.RandomHorizontalFlip(), transforms.RandomRotation(10)]
    return transforms.Compose(steps + [transforms.ToTensor(), NORMALIZE])


def build_model(name, pretrained=False):
    if name == "cnn":
        return nn.Sequential(
            nn.Conv2d(3, 16, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1)),
            nn.Flatten(),
            nn.Dropout(0.2),
            nn.Linear(64, 2),
        )
    if name == "mobilenet":
        model = models.mobilenet_v2(
            weights=models.MobileNet_V2_Weights.DEFAULT if pretrained else None
        )
        for p in model.features.parameters():
            p.requires_grad = False
        model.classifier[1] = nn.Linear(model.last_channel, 2)
        return model
    raise ValueError("Unknown architecture")


def features(image):
    rgb = np.asarray(image.resize((224, 224)).convert("RGB"))
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    hist = cv2.calcHist([hsv], [0, 1, 2], None, [8, 8, 8], [0, 180, 0, 256, 0, 256])
    hist = cv2.normalize(hist, hist).flatten()
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    texture = [
        gray.mean() / 255,
        gray.std() / 255,
        cv2.Laplacian(gray, cv2.CV_64F).var() / 65025,
    ]
    return np.concatenate([hist, texture]).astype(np.float32)
