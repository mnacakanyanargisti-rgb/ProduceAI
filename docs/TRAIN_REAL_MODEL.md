# Train and publish a three-class apple classifier

**Current classes:** `Fresh Apple`, `Rotten or Defective Apple`, and `Not an Apple`. A two-folder binary dataset **will not work** with the current `ml/split.py` and cannot support non-apple rejection tests.

A MobileNetV2 checkpoint **has** already been trained/evaluated and a browser ONNX artifact is committed. See the current [model manifest](../frontend/public/models/manifest.json) and [experiment results](../frontend/public/experiments/results.json). This guide explains how to reproduce or extend that research, not how to claim new results without a fresh run.

## Dataset and ethics

Use a dataset you are entitled to process with three directories:

```text
data/apples/
  fresh/           labeled fresh apples
  rotten/          labeled rotten or visibly defective apples
  not_apple/       varied negative images (candy, cigarettes, other fruits, etc.)
```

Do not relabel other fruits as defective apples. Document image provenance and rights, source groups, class balance, captures, near duplicates, and any mismatch between training and deployment images. The current splitter rejects identical hashes and requires sufficient examples per source group; it cannot automatically detect near duplicates. Keep images of the same physical apple, or near-identical frames, within a single split before making accuracy claims. If a source publishes an official held-out test partition, preserve its provenance and do not silently resplit it and call it the official benchmark.

**Licensing warning:** The existing GitHub training workflow references sources whose permissions are not verified and includes an academic-only source. Verify each license before running experiments with shared/public artifacts, particularly for commercial use. The pretrained ImageNet backbone has separate applicable terms.

## Python installation

Python 3.11 is recommended. From the repository root:

```sh
python -m venv .venv
# Activate the environment for your shell.
python -m pip install -r backend/requirements.txt
```

Optional ONNX export dependencies: `python -m pip install "onnx>=1.17,<2" "onnxruntime>=1.20,<2"`.

## Train locally with an audited dataset

```sh
python -m ml.split --data data/apples --source "YOUR_VERIFIED_SOURCE" --license "YOUR_VERIFIED_LICENSE" --seed 42
python -m ml.eda
python -m ml.train --manifest data/manifest.csv --model baseline --version research-v1
python -m ml.train --manifest data/manifest.csv --model cnn --epochs 15 --version research-v1
python -m ml.train --manifest data/manifest.csv --model mobilenet --epochs 12 --batch-size 16 --version research-v1
python -m ml.evaluate --manifest data/manifest.csv --checkpoint models/baseline.joblib
python -m ml.evaluate --manifest data/manifest.csv --checkpoint models/cnn.pt
python -m ml.evaluate --manifest data/manifest.csv --checkpoint models/mobilenet.pt
```

The commands above require **real images and labels**. Missing or insufficient classes intentionally raise an error. The first execution of MobileNetV2 can fetch official ImageNet-initialized weights; it is not already an apple-specific model until trained. The SVM baseline uses an OpenCV-derived color/texture feature vector and Scikit-learn; CNN trains from scratch; MobileNetV2 fine-tunes its classifier and final visual blocks while keeping most pretrained features frozen.

The results produced by `ml.evaluate` reflect the **held-out test**. The default registry is `experiments/results.json`; do not overwrite the published result snapshot with unreviewed local numbers. Use a separate `--output` for exploratory local evaluations if you do not intend to publish.

## Separate external apple validation

The orchard evaluator reads an independent directory of external, labeled fresh and rotten apple photos. Read the CLI help and source before running it:

```sh
python -m ml.evaluate_orchard --help
```

Be explicit whether images are from a published dataset or original field captures. Photographing Armenian apples with documented location, cultivar, device and lighting would be stronger future evidence than an external internet benchmark.

## Protected publication route

The repository provides GitHub Actions workflows:

- `.github/workflows/train-apples.yml`: dataset preparation, MobileNetV2 training, internal and external evaluations, private checkpoint artifacts.
- `.github/workflows/publish-model.yml`: verify matching evaluation data, export ONNX, cross-check PyTorch and ONNX outputs, and publish a model manifest and **both** experiment JSON copies.
- `.github/workflows/pages.yml`: verify source and binary metadata, build/test React, and publish the website.

A local checkpoint is **not** automatically deployed to the website. Running `python -m ml.export_browser --checkpoint ... --evaluation ...` requires a matching validated evaluation file, and its code deliberately refuses publishing models that miss the specified acceptance/rejection thresholds.

Do not publish model files whose training data and checkpoint provenance you cannot audit. Do not change reported metrics manually to pass publication checks.

## Optional Python API

The public Pages site usually runs inference locally in the browser. To test a trusted `.pt` checkpoint through FastAPI instead, set `MODEL_PATH=models/mobilenet.pt` and configure `ALLOWED_ORIGINS` before starting `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`. Set `VITE_API_URL=http://127.0.0.1:8000` in the frontend's `.env.local`. Pages cannot host this API; see [Deployment](DEPLOYMENT.md).

## Limitations

The three-class model predicts broad visible-condition categories, **not** fruit freshness chemistry, pixel-level defect locations, market grades or food safety. The A/B/C browser score is an uncalibrated function of two class probabilities, and the center-region image heuristic is not validated segmentation. Those features require expert-reviewed ground truth and dedicated evaluations before real sorting/pricing use.
