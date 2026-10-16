# Experiment protocol

The initial experiment registry is empty. Do not replace it with illustrative metrics. Only `python -m ml.evaluate` should generate reported classification metrics from held-out predictions.

For each run, retain the following outside the public frontend when it contains sensitive paths:

- Source dataset URL, verified license, acquisition date, label audit notes, cultivar/capture conditions.
- EDA output, duplicate audit, group/near-duplicate decisions, and immutable manifest hash.
- Random seed, package environment, hardware and CPU thread configuration.
- Training configuration, full training/validation loss history, checkpoint hash, selected epoch and selection criterion.
- Test set size, class order, macro precision/recall/F1, accuracy, confusion matrix and warmed-up mean CPU latency.
- Failure analysis, uncertainty and calibration checks, subgroup behavior, and limitations.

All three approaches must use the same audited split to make comparisons meaningful. The current script does not perform hyperparameter search or statistical significance testing. If you add these, tune with training/validation data, predefine the comparison protocol, and reserve the test split for final evaluation.

The test set is intended to represent the initial fresh/rotten image dataset, not all local agricultural conditions. Field validation requires independently collected local images and expert-reviewed labels. A high test accuracy alone does not validate commercial grading, safety, or defect location.

JSON schema version 1 contains an `experiments` array. Each exported row includes name, version, seed, dataset, manifest_sha256, environment, history, test_samples, accuracy, precision, recall, f1, confusion_matrix, inference_ms, and latency_method. Histories use epoch, train_loss, and val_loss. The baseline has an empty history because SVM fitting has no neural epoch loss curve.

Copy only the reviewed public result registry into frontend/public/experiments/results.json and commit that small file. Keep datasets, private absolute paths, environment secrets, and checkpoint binaries out of the repository.
