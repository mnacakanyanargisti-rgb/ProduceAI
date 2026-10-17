import { describe, expect, it } from "vitest";
import { portraitAppleCandidates } from "./browser-model";

describe("portrait apple recovery views", () => {
  it("provides safe top/center regions for a tall mobile photo", () => {
    const crops = portraitAppleCandidates(1080, 1440);
    expect(crops.length).toBe(2);
    for (const box of crops) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
      expect(box.x + box.width).toBeLessThanOrEqual(1);
      expect(box.y + box.height).toBeLessThanOrEqual(1);
    }
  });
  it("does not crop landscape or tiny images", () => {
    expect(portraitAppleCandidates(1600, 900)).toEqual([]);
    expect(portraitAppleCandidates(80, 400)).toEqual([]);
  });
});
