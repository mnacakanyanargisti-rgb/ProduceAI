/**
 * Browser-only experimental screening. The masks and thresholds are heuristic,
 * not learned from annotated fruit images or validated against UNECE grades.
 * When the image is unsuitable, the sorter abstains rather than inventing a grade.
 */
export type VisualSummary = {
  width: number;
  height: number;
  meanBrightness: number;
  meanSaturation: number;
  darkPixelPercent: number;
  sampledPixels: number;
  candidateCoverage: number;
  estimatedDarkArea: number;
  segmentationConfidence: "limited" | "unreliable";
  suggestedTier: "A" | "B" | "C" | "Review required";
  notes: string;
};
const round = (x: number) => Math.round(x * 10) / 10;
export async function inspectImage(file: File): Promise<VisualSummary> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 384 / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Your browser does not support image analysis.");
    context.drawImage(bitmap, 0, 0, w, h);
    const pixels = context.getImageData(0, 0, w, h).data;
    const n = w * h;
    const brightness = new Float32Array(n);
    const saturation = new Float32Array(n);
    let sumB = 0, sumS = 0, dark = 0;
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      const r = pixels[j] / 255, g = pixels[j + 1] / 255, b = pixels[j + 2] / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      brightness[i] = max;
      saturation[i] = max ? (max - min) / max : 0;
      sumB += max; sumS += saturation[i];
      if (max < 0.28) dark++;
    }
    // A central elliptical sample excludes much of the background, but it is NOT
    // a segmentation mask. Only use it for provisional sorting on clean photos.
    let candidate = 0, darkCandidate = 0, brightCandidate = 0, satCandidate = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - w / 2) / (w * 0.32);
      const dy = (y + 0.5 - h / 2) / (h * 0.32);
      if (dx * dx + dy * dy > 1) continue;
      const i = y * w + x;
      candidate++;
      brightCandidate += brightness[i];
      satCandidate += saturation[i];
      if (brightness[i] < 0.32) darkCandidate++;
    }
    if (!candidate) throw new Error("Image is too small to inspect.");
    const candidateDark = darkCandidate / candidate * 100;
    const avgB = brightCandidate / candidate;
    const avgS = satCandidate / candidate;
    // Guard against dark scenes, featureless backgrounds, and obvious non-fruit.
    // This does not guarantee that the central region is an apple.
    const plausible = avgB >= 0.27 && avgB <= 0.98 &&
      avgS >= 0.12 && avgS <= 0.9 && candidateDark <= 40 &&
      bitmap.width >= 100 && bitmap.height >= 100;
    const tier: VisualSummary["suggestedTier"] = !plausible ? "Review required" :
      candidateDark < 2 ? "A" : candidateDark < 8 ? "B" : "C";
    return {
      width: bitmap.width, height: bitmap.height,
      meanBrightness: round(sumB / n * 100),
      meanSaturation: round(sumS / n * 100),
      darkPixelPercent: round(dark / n * 100),
      sampledPixels: n,
      candidateCoverage: round(candidate / n * 100),
      estimatedDarkArea: round(candidateDark),
      segmentationConfidence: plausible ? "limited" : "unreliable",
      suggestedTier: tier,
      notes: plausible
        ? "Provisional image-screening tier only. The center ellipse may include background, shadows, or bite marks; inspect the actual apple before sorting."
        : "Automatic screening abstained. Photograph one whole apple, centered, against a plain contrasting background in even light.",
    };
  } finally {
    bitmap.close();
  }
}
