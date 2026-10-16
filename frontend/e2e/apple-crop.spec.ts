import { test, expect } from "@playwright/test";

test("user can isolate the apple instead of classifying screenshot chrome", async ({ page }) => {
  await page.goto("./#/ai-scanner");
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 450;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f2eee9"; ctx.fillRect(0, 0, 320, 450);
    ctx.fillStyle = "#c22b1c";
    ctx.beginPath(); ctx.ellipse(160, 180, 85, 94, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 345, 320, 105);
    ctx.fillStyle = "#222"; ctx.font = "22px Arial"; ctx.fillText("Google image results", 15, 395);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("input[type=file]").setInputFiles({
    name: "google-screenshot.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  });
  await expect(page.getByText("google-screenshot.png")).toBeVisible();
  await page.getByRole("button", { name: /Crop to apple/ }).click();
  const region = page.getByTestId("crop-canvas");
  await expect(region).toBeVisible();
  const dimensions = await region.boundingBox();
  expect(dimensions).not.toBeNull();
  const { x, y, width, height } = dimensions!;
  await page.mouse.move(x + width * 0.22, y + height * 0.14);
  await page.mouse.down();
  await page.mouse.move(x + width * 0.79, y + height * 0.71, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId("crop-selection")).toBeVisible();
  await page.getByRole("button", { name: "Use cropped photo" }).click();
  await expect(page.getByText("apple-cropped.jpg")).toBeVisible();
  await expect(page.getByTestId("crop-canvas")).toHaveCount(0);
  const result = await page.locator("input[type=file]").evaluate((el) => {
    const input = el as HTMLInputElement;
    // React-owned cropped File exists in preview, not the native file input.
    return input.files?.[0]?.name;
  });
  expect(result).toBe("google-screenshot.png");
});
