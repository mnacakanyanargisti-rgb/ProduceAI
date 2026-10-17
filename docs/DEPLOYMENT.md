# ProduceAI deployment — browser-first research app

**Current live frontend:** https://mnacakanyanargisti-rgb.github.io/ProduceAI/  
**GitHub source:** https://github.com/mnacakanyanargisti-rgb/ProduceAI

This repository **already exists** and GitHub Pages is already configured. The static site is built from the `main` branch by [Frontend CI and GitHub Pages](../.github/workflows/pages.yml). Do **not** create a second repository or reinitialize Git history.

## What actually runs on GitHub Pages

The public site uses React/Vite and loads the trained `frontend/public/models/apple-mobilenet-open-set-v3.onnx` model with ONNX Runtime Web. **Inference can run locally in the browser with no FastAPI deployment.** The model download and ONNX runtime assets require network access initially.

`frontend/public/models/manifest.json` includes the model version, SHA-256 hash, class order and recorded evaluation references. `frontend/public/experiments/results.json` is read by the Model Comparison page; `experiments/results.json` is kept as the same checked-in snapshot. The Pages workflow runs the verifier `node scripts/verify-research-artifacts.mjs` before building so model/metrics mismatches block publication.

**Automatic updates:** new commits to `main` trigger a Pages build and deployment. Pull requests run the build/test checks but do not deploy. GitHub Actions permissions allow Pages deployment; inspect the completed run and actual URL to confirm success after a change.

## Configure optional FastAPI inference

The `backend/` service is *optional*, and GitHub Pages cannot execute Python. You need independent HTTPS container hosting if you want a separate API. Locally:

```sh
python -m pip install -r backend/requirements.txt
# Configure MODEL_PATH to a locally trusted PyTorch checkpoint.
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

On Windows PowerShell, one example:

```powershell
$env:MODEL_PATH = "models/mobilenet.pt"
$env:ALLOWED_ORIGINS = "http://127.0.0.1:5173,http://localhost:5173"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Use `VITE_API_URL=http://127.0.0.1:8000` in `frontend/.env.local` when testing that API from the dev site. In production, set GitHub Actions repository **variable** `VITE_API_URL` to an HTTPS API origin (not a secret or an API key). The frontend checks `GET /health` and uses `POST /predict` only if the API reports a loaded model; otherwise it can fall back to the browser ONNX classifier. Do not configure the production variable unless a working HTTPS service really exists.

An API container can be built using the committed `backend/Dockerfile` and a trusted checkpoint mounted read-only. Configure `MODEL_PATH`, `ALLOWED_ORIGINS=https://mnacakanyanargisti-rgb.github.io`, HTTPS, a rate limit, logging/privacy policies, and sufficient CPU/RAM. CORS does not provide authentication. `GET /health` can report a running API even when no model is loaded; verify `model_loaded=true` explicitly.

## Publishing an updated model

The documented path is:

1. Verify image provenance, rights, labels, and group/near-duplicate audits.
2. Train and evaluate three-class MobileNetV2 with `.github/workflows/train-apples.yml` or the equivalent vetted local pipeline.
3. Test real non-apple rejection and an independent apple dataset; do not claim new accuracy without test evidence.
4. The `.github/workflows/publish-model.yml` workflow verifies evaluation thresholds and ONNX/PyTorch output equivalence before committing the ONNX model, manifest, and **both** recorded experiment JSON copies.
5. The Pages workflow validates the files, builds React, runs frontend/browser tests, and deploys.

Do not manually edit performance figures to satisfy thresholds, and do not upload model checkpoints from untrusted sources. Training dataset rights are not automatically cleared by GitHub Pages publication; some existing sources have unverified or academic-only licensing.

## Pre-presentation checklist

- [ ] Confirm the most recent Pages workflow succeeded for the intended commit.
- [ ] Open the homepage, scanner and model-comparison page in a private browser window.
- [ ] Test one fresh apple, one visibly defective apple, and one non-apple image.
- [ ] Check that accepted apples may get only **research** A/B/C estimates; uncertain and non-apple photos get no grade.
- [ ] Verify the score is not described as measured freshness or a market standard.
- [ ] Keep a screenshot backup and the bilingual [presentation script](PRESENTATION_GUIDE.md).

## Costs and permissions

The public static website is on GitHub Pages; a separate hosted Python API could incur charges and maintenance, but is not required for the current on-device demo. Model/dataset permissions are separate from the MIT license of the original application code. Store no credentials in repository source or in chat.
