import { existsSync, readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

// This test intentionally runs only on builds with an actual evaluated ONNX asset.
// It verifies real browser execution (rather than only loading a pretty status badge).
test("published MobileNet classifies an image on-device", async ({ page }) => {
  const manifest = existsSync("public/models/manifest.json")
    ? JSON.parse(readFileSync("public/models/manifest.json", "utf-8"))
    : null;
  test.skip(
    !existsSync("public/models/apple-mobilenet-open-set-v2.onnx") ||
    manifest?.labels?.[2] !== "Not an Apple",
    "Trained three-class model not yet published",
  );
  test.setTimeout(150_000);
  await page.goto("./#/ai-scanner");
  await expect(page.getByText("AI model ready — on-device")).toBeVisible({ timeout: 20_000 });
  const pngBase64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#eee6d4";
    context.fillRect(0, 0, 256, 256);
    context.fillStyle = "#c13c27";
    context.beginPath();
    context.ellipse(128, 135, 75, 85, 0, 0, 2 * Math.PI);
    context.fill();
    context.fillStyle = "#3d722f";
    context.fillRect(128, 42, 14, 28);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("input[type=file]").setInputFiles({
    name: "test-apple.png",
    mimeType: "image/png",
    buffer: Buffer.from(pngBase64, "base64"),
  });
  await page.getByRole("button", { name: "Classify Apple (AI)" }).click();
  await expect(page.getByText("MODEL PREDICTION")).toBeVisible({ timeout: 100_000 });
  await expect(page.getByText(/MobileNetV2 \(on-device ONNX\)/)).toBeVisible();
  await expect(page.locator(".result h2")).toHaveText(/Fresh Apple|Rotten or Defective Apple|Not an Apple/);
});
