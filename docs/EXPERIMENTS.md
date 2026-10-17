# Experiment protocol and recorded results

## Published snapshot

`frontend/public/experiments/results.json` is the **public, website-facing results registry**. `experiments/results.json` mirrors that research snapshot in source control; training scripts may overwrite it during new local runs. The model manifest is `frontend/public/models/manifest.json`. Both registries should be updated together by the model-publication workflow and checked by `frontend/scripts/verify-research-artifacts.mjs`.

Published model: **MobileNetV2**, version `apples-orchard-v3`. These figures were recorded by a repository training/evaluation run and committed with the model; they have **not** been independently reproduced for this document.

| Held-out classification metric | Recorded value |
| --- | ---: |
| Images | 222 |
| Accuracy | 95.05% |
| Macro precision | 95.85% |
| Macro recall | 95.30% |
| Macro F1 | 95.56% |
| Mean warmed-up CPU preprocessing + inference | 18.36 ms/image |

The 222-image test includes fresh apple, defective apple and selected non-apple examples. The recorded confusion matrix is 4×4: three actual/predicted classes plus an extra **Unable to Verify** prediction column/row. Do not treat the abstention class as a fourth ground-truth training class.

### External apple-only evaluation

The separate orchard-style image evaluation records **180** upstream test photographs (90 fresh + 90 rotten/defective). It reports **92.22%** correct fresh-vs-defective classification among those images and **100% apple acceptance** in that sample. Its source is the upstream `mustafa20999/AFQC` Test partition, **not a set of original Armenian-orchard photos**. Its accuracy cannot certify other cultivars, cameras or local growing conditions.

### Relevant non-apple group checks

The published metadata reports 12/12 candy and 13/14 cigarette images rejected as `Not an Apple` in the named test groups. These are small, selected samples and do **not** prove the model can reject every non-apple object. Novel objects can still be misclassified as apples.

### What has *not* been measured

There are **no published comparable SVM or custom CNN metrics** yet, despite their training implementations. No validated pixel-level apple defect mask, calibrated freshness score, A/B/C commercial grade accuracy, volume estimate, food safety outcome, or production pricing model is established by these results. The browser's A/B/C display derives from class probabilities, and its optional visual screening is heuristic.

## Reproduction requirements

For every new run, record:

1. Source URLs, acquisition dates, dataset licenses/permissions, labeling methods, cultivar and lighting/capture information.
2. Exact hashes, manual duplicate and near-duplicate review, class balance, and grouping decisions before splitting.
3. Frozen train/validation/test split, random seed, Python/dependency versions, CPU/GPU and hardware details.
4. Training hyperparameters, selected epoch, train/validation losses, artifact checksums.
5. Held-out sample counts, accuracy, macro precision/recall/F1, confusion matrix, abstentions and inference latency.
6. Non-apple subgroup error rates and an independently sourced real-world apple test, with clear provenance and limitations.

Use one audited, leak-free split for SVM/CNN/MobileNetV2 comparisons. Never choose hyperparameters after inspecting the final test set. Different photographs of the **same apple** should stay in the same split; existing exact-byte deduplication alone does not ensure this.

## Publication and registry contract

- The evaluation script `python -m ml.evaluate --checkpoint models/mobilenet.pt` writes the local registry by default.
- The orchard evaluation adds external data to that registry.
- `ml/export_browser.py` requires matching evaluation metadata, selected negative-group rejection thresholds, and external apple acceptance before exporting a public ONNX file and SHA-256 manifest.
- `.github/workflows/publish-model.yml` copies the evaluated results into **both** tracked JSON paths, commits them with the ONNX and manifest, and triggers the Pages workflow.
- `node frontend/scripts/verify-research-artifacts.mjs` checks model SHA-256, class/metric consistency, result-registry agreement and basic confusion-matrix integrity.

Inspect licenses **before** reproducing/commercializing: the recorded training workflow includes sources that are unverified or marked academic-only. Public model availability is not a commercial-use permission.

See also [README](../README.md), [training](TRAIN_REAL_MODEL.md), and [architecture](ARCHITECTURE.md).
