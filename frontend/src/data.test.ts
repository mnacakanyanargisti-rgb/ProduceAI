import { describe, it, expect } from "vitest";
import { validateFile, parsePrediction, MAX_SIZE } from "./data";
describe("upload validation", () => {
  it("rejects unsupported or oversized files", () => {
    expect(validateFile({ type: "image/svg+xml", size: 20 })).toBeTruthy();
    expect(
      validateFile({ type: "image/png", size: MAX_SIZE + 1 }),
    ).toBeTruthy();
    expect(validateFile({ type: "image/jpeg", size: 100 })).toBeNull();
  });
});
describe("API contract", () => {
  it("rejects fabricated or malformed responses", () => {
    expect(() => parsePrediction({ label: "Fresh Apple" })).toThrow();
    expect(() =>
      parsePrediction({
        label: "Fresh Apple",
        model_name: "cnn",
        model_version: "1",
        inference_ms: 12,
        probabilities: { "Fresh Apple": 0.8, "Rotten or Defective Apple": 0.2 },
      }),
    ).not.toThrow();
  });
});
