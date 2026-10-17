# ProduceAI — Computer Vision for Apple Quality Research

**University project · French University in Armenia · Argishti Mnatsakanyan**

[Live research website](https://mnacakanyanargisti-rgb.github.io/ProduceAI/) · [Presentation guide (English + Armenian)](docs/PRESENTATION_GUIDE.md) · [Architecture](docs/ARCHITECTURE.md) · [Experiments](docs/EXPERIMENTS.md)

ProduceAI explores image-based apple recognition and **visible-condition classification**. The current research model distinguishes **Fresh Apple**, **Rotten or Defective Apple**, and **Not an Apple**. It provides a working browser demo, recorded experimental results, and reproducible Python training/evaluation infrastructure. It is **not** a food-safety detector, a validated defect-segmentation system, or a certified commercial grading instrument.

## Current project status

| Component | Status | Evidence |
| --- | --- | --- |
| React/TypeScript website | Published on GitHub Pages | [Live demo](https://mnacakanyanargisti-rgb.github.io/ProduceAI/) |
| Browser-based image classification | Published MobileNetV2 ONNX model | [Model manifest](frontend/public/models/manifest.json) and `frontend/public/models/apple-mobilenet-open-set-v3.onnx` |
| Experimental classification evaluation | Recorded for MobileNetV2 | [Published results](frontend/public/experiments/results.json) |
| SVM baseline and custom CNN | Training implementations provided; no comparable published evaluations yet | [Training code](ml/train.py) |
| Optional Python inference API | Implemented but requires independent hosting and a configured checkpoint | [FastAPI](backend/main.py) |
| Experimental A/B/C score | Implemented as a probability-derived **research estimate** | [Formula](frontend/src/apple-grading.ts) |
| Surface-defect segmentation, calibrated freshness %, commercial pricing | **Not validated or implemented as production measurements** | [Limitations](#important-limitations) |

**Recorded results (MobileNetV2 `apples-orchard-v3`):** held-out classification accuracy **95.05%** and macro F1 **95.56%** on **222** images. A separately sourced orchard-image test reported **92.22%** correct fresh-versus-defective classification on **180** images. These numbers are read from committed experiment metadata, **not independently reproduced in this README**. The latter images are from an external published dataset, not a verified Armenian-orchard field trial. Neither result measures A/B/C commercial grading accuracy.

## Repository map

```text
frontend/
  src/main.tsx               Six-page React application and scanner
  src/browser-model.ts       ONNX Runtime Web image inference
  src/apple-grading.ts       Experimental A/B/C calculation
  src/visual-analysis.ts     Non-ML, heuristic image screening
  public/models/            Published ONNX model and audited manifest
  public/experiments/       Results shown by the public website
backend/
  main.py                    Optional FastAPI /health and /predict endpoints
  tests/                    API tests
ml/
  split.py                   Stratified train/validation/test manifest
  eda.py                     Dataset descriptive statistics
  models.py                  SVM features, CNN, MobileNetV2, preprocessing
  train.py                   SVM/CNN/MobileNetV2 training
  inference.py               CPU checkpoint predictions and abstention
  evaluate.py                Held-out classification evaluation
  evaluate_orchard.py        Separate external orchard evaluation
  export_browser.py         Checked PyTorch-to-ONNX export
experiments/results.json    Checked-in research snapshot; keep synced on publication
docs/                       Architecture, methods, validation, presentation
.github/workflows/          Train, publish model, Pages + API checks
```

## End-to-end processing

1. **Data and preprocessing:** collect labeled photos, detect exact-byte duplicates, stratify a manifest into **70% training / 15% validation / 15% test**, and prepare images (224×224 RGB and ImageNet normalization for neural models). Additional near-duplicate/capture-session checks remain necessary.
2. **Learning:** OpenCV color/texture features with an SVM baseline; a custom CNN; and transfer learning with MobileNetV2. The published model is MobileNetV2, trained as a three-class classifier.
3. **Evaluation:** record held-out accuracy, precision, recall, macro F1, a confusion matrix, latency, and separate rejection rates for selected non-apple groups. Avoid tuning on the test split.
4. **Publication:** verify the held-out evaluation and independent orchard results, export a versioned ONNX model, and publish it with an integrity manifest.
5. **Prediction:** on the public GitHub Pages website, ONNX Runtime Web preprocesses the user's image and runs the classifier **locally in the browser**. When a separately hosted FastAPI service is configured and has a loaded checkpoint, the frontend can instead call `POST /predict`.
6. **Display:** accepted apple predictions may show an **experimental A/B/C estimate**; non-apple or uncertain predictions do not receive grades. Successful prediction metadata can be stored in browser localStorage; photos are not saved there.

## Important limitations

- **Classification is not segmentation.** The current model classifies images; it does **not** identify exact blemish boundaries or measure the true percentage of defective apple surface.
- **A/B/C is an experimental score**, calculated as `100 * P(Fresh Apple) / (P(Fresh Apple) + P(Rotten or Defective Apple))` once an apple class is accepted. A ≥75, B ≥50 and <75, C <50. **This percentage is not a calibrated physical freshness measure and must not be interpreted as a validated market-quality grade.**
- `visual-analysis.ts` estimates brightness/saturation/dark areas in a central crop using simple heuristics. That crop is **not** an apple segmentation mask. Shadows and backgrounds can affect the result.
- Three-class classification cannot reject every unknown object; `Unable to Verify` is an intentional abstention. Green apples, unusual camera angles, cultivars and new lighting conditions can still produce errors.
- The published datasets require provenance/license checks; the training workflow records unverified license status and includes a source marked academic-only. **Do not assume commercial redistribution or deployment rights.**
- Do not infer food safety, chemical quality, internal damage, pricing recommendations, or regulatory grades from the research predictions.

## Run the public-style frontend locally

Requirements: **Node.js 22+** and **pnpm 11.25.0**. From the repository root:

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:5173/ProduceAI/ . Because the published ONNX file is in `frontend/public/models/`, the browser model can work without a Python server when its runtime assets load. An optional `frontend/.env.local` file can set `VITE_API_URL=http://127.0.0.1:8000` if you are running the backend.

```sh
pnpm lint
pnpm test
pnpm build
node scripts/verify-research-artifacts.mjs
pnpm exec playwright install chromium
pnpm exec playwright test
```

The artifact check ensures that the published model, manifest, and both recorded-results copies agree. GitHub Pages CI runs this check. The workflow that publishes a newly trained model updates both results files.

## Optional FastAPI backend

Python 3.11 is recommended. From the repository root:

```sh
python -m venv .venv
# Activate: Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m pytest backend/tests -q
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

`GET /health` and interactive docs at http://127.0.0.1:8000/docs work without a model, but `POST /predict` returns **503** until `MODEL_PATH` points to a trusted local `.pt` or `.joblib` checkpoint. GitHub Pages **cannot run Python**; host this API separately over HTTPS if needed. See [Deployment](docs/DEPLOYMENT.md).

## Reproduce or extend the research

See [Train a real model](docs/TRAIN_REAL_MODEL.md) and [Experiment protocol](docs/EXPERIMENTS.md). A typical run starts with a correctly licensed three-folder dataset at `data/apples/{fresh,rotten,not_apple}/`:

```sh
python -m ml.split --data data/apples --source "DATASET_SOURCE" --license "VERIFIED_LICENSE" --seed 42
python -m ml.eda
python -m ml.train --model mobilenet --epochs 12 --batch-size 16 --version local-v1
python -m ml.evaluate --checkpoint models/mobilenet.pt
```

The final command writes local experiment results; it does **not** automatically publish a new browser model. You must also audit provenance, run separate evaluations, and follow the guarded export/publication workflow. Keep checkpoint artifacts, datasets and secrets out of normal commits; the distributed ONNX model is a specifically approved, versioned publication.

## For the university presentation

Read **[docs/PRESENTATION_GUIDE.md](docs/PRESENTATION_GUIDE.md)** for the exact GitHub click order and bilingual **English → Armenian** talking points. Demonstrate the ML code **before** opening the live site. For a working example, try a clean photo of one fresh apple, one clearly damaged apple, and one non-apple object; never promise perfect results.

## Future work

Independently photographed and expert-labeled Armenian apples; group-aware evaluation to prevent near-duplicate/capture leakage; calibrated abstention and confidence; a separately trained apple/blemish segmentation model with pixel-level labels; physical quality criteria validated with growers; inventory/pricing integration only **after** those measurements are supported by evidence.

## References

- [Course-relevant methods and project architecture](docs/ARCHITECTURE.md)
- [Official PyTorch MobileNetV2](https://docs.pytorch.org/vision/stable/models/generated/torchvision.models.mobilenet_v2.html)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Vite static deployment](https://vite.dev/guide/static-deploy.html)

The MIT license applies to original application code; it does **not** override the licenses of datasets, training photos, or third-party pretrained weights.
