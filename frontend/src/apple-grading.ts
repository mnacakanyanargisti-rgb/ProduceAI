import type { Prediction } from "./data";

/**
 * Research demo score derived from the existing fresh-vs-defective classifier.
 *
 * This is NOT a measurement of physical freshness or a calibrated percentage.
 * Removing the non-apple probability from the denominator prevents the verifier's
 * confidence from silently changing the score once the image is accepted.
 *
 * Never grade a Not an Apple / Unable to Verify result.
 */
export type AppleGrade = "A" | "B" | "C";
export type GradeResult = { grade: AppleGrade; score: number; description: string };
const FRESH = "Fresh Apple";
const DEFECTIVE = "Rotten or Defective Apple";

export function gradeFromFreshness(score: number): AppleGrade {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError("Freshness score must be between 0 and 100");
  }
  return score >= 75 ? "A" : score >= 50 ? "B" : "C";
}

export function estimateAppleGrade(
  prediction: Pick<Prediction, "label" | "probabilities">,
): GradeResult | null {
  if (prediction.label !== FRESH && prediction.label !== DEFECTIVE) return null;
  const fresh = prediction.probabilities[FRESH];
  const defective = prediction.probabilities[DEFECTIVE];
  if (!Number.isFinite(fresh) || !Number.isFinite(defective) ||
      fresh < 0 || defective < 0 || fresh > 1 || defective > 1 ||
      fresh + defective <= 0) return null;
  const score = Math.min(100, Math.max(0, (fresh / (fresh + defective)) * 100));
  const grade = gradeFromFreshness(score);
  const description = grade === "A"
    ? "Լավ վիճակ / Good"
    : grade === "B"
      ? "Միջին վիճակ / Average"
      : "Վնասված կամ վատ վիճակ / Poor";
  return { grade, score, description };
}
