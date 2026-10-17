#!/usr/bin/env node
// Verify that tracked research evidence and the browser model are from the same release.
// Run from any directory: node frontend/scripts/verify-research-artifacts.mjs
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const frontend = resolve(here, "..");
const root = resolve(frontend, "..");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const resultPublic = json(join(frontend, "public", "experiments", "results.json"));
const resultRoot = json(join(root, "experiments", "results.json"));
const metadata = json(join(frontend, "public", "models", "manifest.json"));

assert.deepEqual(resultRoot, resultPublic,
  "Root experiment snapshot differs from the public website results; publish both together.");
assert.equal(resultPublic.schema_version, 1, "Unsupported experiment results schema");
assert.ok(Array.isArray(resultPublic.experiments) && resultPublic.experiments.length > 0,
  "Published models require actual experiment records.");
assert.deepEqual(metadata.labels,
  ["Fresh Apple", "Rotten or Defective Apple", "Not an Apple"],
  "Class order must match the published classifier.");
assert.equal(metadata.model_name, "MobileNetV2");
assert.equal(metadata.input_size, 224);
assert.match(metadata.onnx_file, /^[a-zA-Z0-9._-]+\.onnx$/);
assert.match(metadata.model_sha256, /^[a-f0-9]{64}$/);

const modelPath = join(frontend, "public", "models", metadata.onnx_file);
const hash = createHash("sha256").update(readFileSync(modelPath)).digest("hex");
assert.equal(hash, metadata.model_sha256,
  "Published ONNX binary does not match its integrity manifest.");

const matching = resultPublic.experiments.filter(
  (e) => e.name === "mobilenet" && e.version === metadata.model_version,
);
assert.equal(matching.length, 1, "Expected exactly one matching MobileNet experiment.");
const experiment = matching[0];

for (const key of ["accuracy", "f1", "test_samples"]) {
  assert.equal(metadata[key], experiment[key], `Model manifest does not match results: ${key}`);
}
assert.ok(experiment.test_samples >= 10);
for (const metric of ["accuracy", "precision", "recall", "f1"]) {
  assert.ok(Number.isFinite(experiment[metric]) && experiment[metric] >= 0 && experiment[metric] <= 1,
    `Invalid research metric: ${metric}`);
}
assert.ok(Array.isArray(experiment.confusion_matrix) && experiment.confusion_matrix.length === 4,
  "Expected three classes plus an uncertainty/abstention column.");
let total = 0;
for (const row of experiment.confusion_matrix) {
  assert.ok(Array.isArray(row) && row.length === 4);
  for (const n of row) {
    assert.ok(Number.isInteger(n) && n >= 0, "Invalid confusion matrix entry.");
    total += n;
  }
}
assert.equal(total, experiment.test_samples, "Confusion matrix totals disagree with test sample count.");

assert.deepEqual(metadata.negative_group_rejection, experiment.negative_group_rejection,
  "Negative-class results differ between manifest and experiments.");
assert.deepEqual(metadata.external_orchard, experiment.external_orchard,
  "External apple evaluation differs between manifest and experiments.");
assert.equal(metadata.apple_acceptance, experiment.apple_acceptance);

console.log(`Research artifacts verified: ${metadata.model_version}, ${experiment.test_samples} test samples, SHA-256 ${hash.slice(0, 12)}…`);
