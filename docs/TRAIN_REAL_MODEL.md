# Train a real apple classifier

Dataset: https://huggingface.co/datasets/menasi11/fruit-classification

The public dataset has fresh/rotten apple, banana and orange images. The importer
filters for apples. Review its provenance and license before any commercial use.
The source's own test split is not preserved by this importer; our split is newly
generated and must not be described as the provider's official test benchmark.

## Run in a Python environment with enough RAM/storage

From the repository root:

```bash
python -m pip install -r backend/requirements.txt
python -m pip install datasets
python -m ml.fetch_apples --output data/apples
python -m ml.split --data data/apples --source "https://huggingface.co/datasets/menasi11/fruit-classification" --license "Check upstream dataset license"
python -m ml.train --manifest data/manifest.csv --model mobilenet --epochs 12 --batch-size 16 --version v1 --output models
python -m ml.evaluate --help
```

The resulting trusted checkpoint is `models/mobilenet.pt`. Training and
evaluation have **not** been run by the GitHub changes alone. Report actual
held-out accuracy, precision, recall, F1 and confusion matrix before claiming
the model works on unseen apples. Review near-duplicates and photo-session
leakage (the current split only catches exact duplicate bytes).

To run locally after a successful training run:

```bash
MODEL_PATH=models/mobilenet.pt ALLOWED_ORIGINS=http://localhost:5173 uvicorn backend.main:app --port 8000
```

In `frontend/.env.local` set `VITE_API_URL=http://127.0.0.1:8000`,
then start the frontend. For the public GitHub Pages site, deploy the API to a
separate HTTPS host, configure `ALLOWED_ORIGINS` to
`https://mnacakanyanargisti-rgb.github.io`, and add the GitHub Actions
repository variable `VITE_API_URL` with that API origin. GitHub Pages itself
cannot host the Python API.

**Safety/quality limitations:** Fresh vs rotten is binary classification, not
UNECE Extra/I/II grading or food-safety certification. A bitten apple, shadows,
or unusual background can cause mistakes. Do not use the current experimental
A/B/C center-region heuristic for pricing or commercial rejection.
