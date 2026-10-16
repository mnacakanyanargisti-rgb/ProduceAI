export type Prediction = {
  label: "Fresh Apple" | "Rotten or Defective Apple" | "Not an Apple" | "Unable to Verify";
  probabilities: Record<string, number>;
  model_name: string;
  model_version: string;
  inference_ms: number;
  timestamp: string;
  id: string;
};
export const MAX_SIZE = 8 * 1024 * 1024;
export function validateFile(file: Pick<File, "type" | "size">): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Choose a JPEG, PNG, or WebP image.";
  if (file.size === 0 || file.size > MAX_SIZE)
    return "Choose a non-empty image smaller than 8 MB.";
  return null;
}
export function parsePrediction(
  value: unknown,
): Omit<Prediction, "timestamp" | "id"> {
  const p = value as Prediction;
  if (
    !p ||
    !["Fresh Apple", "Rotten or Defective Apple", "Not an Apple", "Unable to Verify"].includes(p.label) ||
    typeof p.model_name !== "string" ||
    typeof p.model_version !== "string" ||
    !Number.isFinite(p.inference_ms) ||
    p.inference_ms < 0
  )
    throw new Error("The API returned an invalid prediction.");
  const values = ["Fresh Apple", "Rotten or Defective Apple", "Not an Apple"].map(
    (k) => p.probabilities?.[k],
  );
  if (
    values.some((v) => !Number.isFinite(v) || v < 0 || v > 1) ||
    Math.abs(values.reduce((a, b) => a + b, 0) - 1) > 0.01
  )
    throw new Error("The API returned invalid class probabilities.");
  return {
    label: p.label,
    probabilities: p.probabilities,
    model_name: p.model_name,
    model_version: p.model_version,
    inference_ms: p.inference_ms,
  };
}
export function loadHistory(): Prediction[] {
  try {
    const rows: unknown = JSON.parse(
      localStorage.getItem("produceai.history.v1") || "[]",
    );
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((p) => {
        try {
          parsePrediction(p);
          return typeof p.timestamp === "string" && typeof p.id === "string";
        } catch {
          return false;
        }
      })
      .slice(-500);
  } catch {
    return [];
  }
}
