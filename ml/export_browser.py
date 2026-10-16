"""Export a trained, evaluated PyTorch apple classifier for local browser inference.

Outputs a standalone ONNX file plus small audited metadata. The binary is served
by GitHub Pages and evaluated entirely on the user's device (no API required).
"""
import argparse
import json
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch
from ml.models import LABELS, build_model


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--checkpoint", type=Path, required=True)
    p.add_argument("--evaluation", type=Path, required=True)
    p.add_argument("--output-dir", type=Path, default=Path("frontend/public/models"))
    a = p.parse_args()
    data = torch.load(a.checkpoint, map_location="cpu", weights_only=True)
    if data.get("name") != "mobilenet" or data.get("labels") != LABELS:
        raise ValueError("This browser exporter requires the expected MobileNet apple model.")
    if not a.evaluation.is_file():
        raise FileNotFoundError("Held-out evaluation is required before export.")
    results = json.loads(a.evaluation.read_text(encoding="utf-8"))
    experiments = [
        e for e in results.get("experiments", [])
        if e.get("name") == "mobilenet" and e.get("version") == data.get("version")
    ]
    if len(experiments) != 1:
        raise ValueError("No matching evaluation for checkpoint version.")
    metrics = experiments[0]
    if metrics.get("test_samples", 0) < 10:
        raise ValueError("At least 10 held-out samples required for public release.")
    rejection = metrics.get("negative_group_rejection", {})
    for group in ("cigarette", "candy"):
        result = rejection.get(group, {})
        if result.get("samples", 0) < 3 or result.get("rejection_rate", 0) < 0.75:
            raise ValueError(f"Unsafe to publish: poor held-out {group} rejection {result}")
    if metrics.get("apple_acceptance", 0) < 0.75:
        raise ValueError("Unsafe to publish: excessive rejection of real apples")
    model = build_model("mobilenet", pretrained=False)
    model.load_state_dict(data["state_dict"])
    model.eval()
    a.output_dir.mkdir(parents=True, exist_ok=True)
    destination = a.output_dir / "apple-mobilenet.onnx"
    torch.manual_seed(123)
    sample = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        model,
        sample,
        destination.as_posix(),
        input_names=["image"],
        output_names=["logits"],
        dynamic_axes=None,
        opset_version=17,
        dynamo=False,
    )
    graph = onnx.load(destination.as_posix())
    onnx.checker.check_model(graph)
    with torch.inference_mode():
        expected = model(sample).numpy()
    sess = ort.InferenceSession(destination.as_posix(), providers=["CPUExecutionProvider"])
    observed = sess.run(["logits"], {"image": sample.numpy()})[0]
    np.testing.assert_allclose(expected, observed, rtol=2e-3, atol=2e-4)
    meta = {
        "model_name": "MobileNetV2",
        "model_version": str(data["version"]),
        "labels": LABELS,
        "input_size": 224,
        "onnx_file": destination.name,
        "accuracy": float(metrics["accuracy"]),
        "f1": float(metrics["f1"]),
        "test_samples": int(metrics["test_samples"]),
        "negative_group_rejection": rejection,
        "apple_acceptance": float(metrics["apple_acceptance"]),
        "min_apple_confidence": 0.80,
        "max_nonapple_probability": 0.15,
        "dataset": str(metrics["dataset"]),
        "limitations": "Three-class fresh/rotten/not-apple research classifier. Open-set recognition cannot guarantee rejection of every non-apple object; not food safety or commercial grading.",
    }
    import hashlib
    meta["model_sha256"] = hashlib.sha256(destination.read_bytes()).hexdigest()
    (a.output_dir / "manifest.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print("Exported and verified ONNX runtime parity:", destination.stat().st_size, "bytes")
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
