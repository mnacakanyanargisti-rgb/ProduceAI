import { describe, expect, it } from "vitest";
import { estimateAppleGrade, gradeFromFreshness } from "./apple-grading";
import type { Prediction } from "./data";

const base = {
  label: "Fresh Apple" as const,
  probabilities: {
    "Fresh Apple": 0.78,
    "Rotten or Defective Apple": 0.20,
    "Not an Apple": 0.02,
  },
};

describe("requested 75 / 50 grading boundaries", () => {
  it("uses A >=75, B >=50, C otherwise", () => {
    expect(gradeFromFreshness(100)).toBe("A");
    expect(gradeFromFreshness(75)).toBe("A");
    expect(gradeFromFreshness(74.999)).toBe("B");
    expect(gradeFromFreshness(50)).toBe("B");
    expect(gradeFromFreshness(49.999)).toBe("C");
    expect(gradeFromFreshness(0)).toBe("C");
    expect(() => gradeFromFreshness(-1)).toThrow();
    expect(() => gradeFromFreshness(101)).toThrow();
    expect(() => gradeFromFreshness(NaN)).toThrow();
  });

  it("normalizes between the two apple classes, not against the non-apple class", () => {
    const result = estimateAppleGrade(base);
    expect(result?.grade).toBe("A");
    expect(result?.score).toBeCloseTo(79.5918, 3);
    expect(estimateAppleGrade({
      label: "Rotten or Defective Apple",
      probabilities: { "Fresh Apple": 0.45, "Rotten or Defective Apple": 0.45, "Not an Apple": 0.10 },
    })?.grade).toBe("B");
    expect(estimateAppleGrade({
      label: "Rotten or Defective Apple",
      probabilities: { "Fresh Apple": 0.2, "Rotten or Defective Apple": 0.75, "Not an Apple": 0.05 },
    })?.grade).toBe("C");
  });

  it("never generates grades for uncertain or not-apple decisions, or bad scores", () => {
    for (const label of ["Not an Apple", "Unable to Verify"] as Prediction["label"][]) {
      expect(estimateAppleGrade({ ...base, label })).toBeNull();
    }
    expect(estimateAppleGrade({
      label: "Fresh Apple",
      probabilities: { "Fresh Apple": 0, "Rotten or Defective Apple": 0, "Not an Apple": 1 },
    })).toBeNull();
  });
});
