/**
 * Experimental browser-only image statistics. NOT a trained classifier,
 * defect detector, commercial grade, or food-safety assessment.
 */
export type VisualSummary = {
  width: number;
  height: number;
  meanBrightness: number;
  meanSaturation: number;
  darkPixelPercent: number;
  sampledPixels: number;
};
export async function inspectImage(file: File): Promise<VisualSummary> {
  const bitmap = await createImageBitmap(file);
  try {
    const width = Math.min(384, bitmap.width);
    const height = Math.max(1, Math.round(bitmap.height * width / bitmap.width));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Your browser does not support image analysis.");
    context.drawImage(bitmap, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    let brightness = 0, saturation = 0, dark = 0, count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) continue;
      const r = pixels[i] / 255, g = pixels[i + 1] / 255, b = pixels[i + 2] / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const value = max;
      brightness += value;
      saturation += max === 0 ? 0 : (max - min) / max;
      if (value < 0.28) dark++;
      count++;
    }
    if (!count) throw new Error("The image contains no visible pixels.");
    return {
      width: bitmap.width,
      height: bitmap.height,
      meanBrightness: Math.round(brightness / count * 1000) / 10,
      meanSaturation: Math.round(saturation / count * 1000) / 10,
      darkPixelPercent: Math.round(dark / count * 1000) / 10,
      sampledPixels: count,
    };
  } finally {
    bitmap.close();
  }
}
