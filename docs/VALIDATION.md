# ProduceAI validation status — 17 October 2026

This is a research status record, **not** a guarantee of commercial fruit-quality accuracy. The older initial delivery report was written before the published model existed; its claims of no repository, model or deployment no longer describe the current state.

## Verified repository and CI evidence

- Source repository: https://github.com/mnacakanyanargisti-rgb/ProduceAI
- Published frontend source includes a versioned MobileNetV2 ONNX binary and matching `manifest.json`.
- Published evaluation registry at `frontend/public/experiments/results.json` records `apples-orchard-v3` results on 222 held-out examples and 180 external apple photos.
- GitHub Actions [Frontend CI and GitHub Pages run 39025795157](https://github.com/mnacakanyanargisti-rgb/ProduceAI/actions/runs/39025795157) completed **successfully** for commit `9c5bfa52` on 17 October 2026.
- GitHub Actions [API tests run 39025795114](https://github.com/mnacakanyanargisti-rgb/ProduceAI/actions/runs/39025795114) completed **successfully** for the same commit.
- GitHub Actions [Publish trained apple model run 38960792533](https://github.com/mnacakanyanargisti-rgb/ProduceAI/actions/runs/38960792533) completed **successfully** on 16 October 2026.

Those run statuses were obtained from GitHub; they do **not** substitute for personally reproducing all training metrics or independently testing a random new set of Armenian apples. After each new PR or merge, inspect its *own* latest workflow results rather than reusing these older run IDs.

## Automated evidence integrity

The Pages workflow additionally runs `node frontend/scripts/verify-research-artifacts.mjs` (with `frontend/` as its working directory). The script checks:

1. Published and root research JSON registries match.
2. A published experiment matches MobileNetV2 `model_version`.
3. Reported accuracy, F1, sample count, negative rejection and external apple results agree with the manifest.
4. Confusion-matrix counts sum to the reported test sample total.
5. The actual ONNX binary's SHA-256 hash agrees with the published manifest.

This check catches version/metadata drift. It cannot prove that training labels are correct, that source licenses permit every use, or that the model generalizes to a new orchard.

## Recorded research evidence and scope

From the committed result JSON: test accuracy **95.05%** on **222** images, macro F1 **95.56%**, and separate fresh-vs-defective correct classification **92.22%** on **180** external orchard-style images. The latter come from the upstream `AFQC` published test partition, not photographs collected in Armenian orchards for this project.

The published result file contains **one measured MobileNetV2 experiment**. SVM and CNN are implemented as possible baselines; their accuracy has not been published in this registry. Classification numbers do **not** measure defect segmentation or A/B/C market grading.

## Still to verify before real-world use

- Independent confirmation of all data permissions (at least one source is marked academic-only in research metadata).
- Manual label, cultivar, exact/near-duplicate and session-level leakage audit.
- Fresh, rotten, and non-apple photos collected under realistic Armenian lighting and background conditions.
- Confidence calibration, false-accept and false-reject costs, and new unknown objects.
- Pixel-level annotated blemish masks and expert-validated commercial thresholds, if defect localization/pricing is later added.
- Production security, monitoring and access controls for any independently deployed public FastAPI service.

Use the [presentation guide](PRESENTATION_GUIDE.md) to keep these limitations explicit during a live demonstration.
