import { existsSync, readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

// This test intentionally runs only on builds with an actual evaluated ONNX asset.
// It verifies real browser execution (rather than only loading a pretty status badge).
test("published MobileNet classifies an image on-device", async ({ page }) => {
  const manifest = existsSync("public/models/manifest.json")
    ? JSON.parse(readFileSync("public/models/manifest.json", "utf-8"))
    : null;
  test.skip(
    !existsSync("public/models/apple-mobilenet-open-set-v3.onnx") ||
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
  await expect(page.locator(".result h2")).toHaveText(/Grade [ABC]|Not an Apple|Unable to Verify/);
  if (await page.getByTestId("apple-grade").count()) {
    await expect(page.getByTestId("freshness-score")).toContainText("%");
  }
});

test("rejects real candy and cigarette photos as Not an Apple", async ({ page, request }) => {
  const manifest = existsSync("public/models/manifest.json")
    ? JSON.parse(readFileSync("public/models/manifest.json", "utf-8"))
    : null;
  test.skip(
    !existsSync("public/models/apple-mobilenet-open-set-v3.onnx") ||
    manifest?.labels?.[2] !== "Not an Apple",
    "Only applies to the evaluated three-class model",
  );
  test.setTimeout(180_000);
  await page.goto("./#/ai-scanner");
  await expect(page.getByText("AI model ready — on-device")).toBeVisible({ timeout: 25_000 });

  const realExamples = [
    {
      name: "cigarette.png",
      url: "https://raw.githubusercontent.com/LoaferCH/dataset_classification_cigarettes/master/cigs/1.png",
    },
    {
      name: "candy.png",
      url: "https://raw.githubusercontent.com/PerceptiLabs/Recognizing-Groceries/main/data/CANDY/CANDY0369.png",
    },
  ];
  for (const image of realExamples) {
    const download = await request.get(image.url, { timeout: 35_000 });
    expect(download.ok(), `Fixture download failed: ${image.name}`).toBeTruthy();
    await page.locator("input[type=file]").setInputFiles({
      name: image.name,
      mimeType: "image/png",
      buffer: await download.body(),
    });
    await page.getByRole("button", { name: "Classify Apple (AI)" }).click();
    await expect(page.locator(".result h2")).toHaveText("Not an Apple", {
      timeout: 90_000,
    });
    await expect(page.getByText("Սա խնձոր չէ", { exact: false })).toBeVisible();
    await expect(page.locator(".result .probability")).toHaveCount(0);
  }
});

test("recognizes real orchard apples from a never-trained source split", async ({ page, request }) => {
  const manifest = existsSync("public/models/manifest.json")
    ? JSON.parse(readFileSync("public/models/manifest.json", "utf-8"))
    : null;
  test.skip(
    !existsSync("public/models/apple-mobilenet-open-set-v3.onnx") ||
    manifest?.model_version !== "apples-orchard-v3",
    "Require trained orchard-aware ONNX model",
  );
  test.setTimeout(180_000);
  await page.goto("./#/ai-scanner");
  await expect(page.getByText("AI model ready — on-device")).toBeVisible({ timeout: 20000 });
  const samples = [
    {
      name: "fresh-apple.jpg",
      url: "https://raw.githubusercontent.com/mustafa20999/AFQC/main/Test/apple_fresh/apple_fresh%20%281038%29.JPG",
    },
    {
      name: "rotten-apple.jpg",
      url: "https://raw.githubusercontent.com/mustafa20999/AFQC/main/Test/apple_rotten/apple_rotten%20%281045%29.JPG",
    },
  ];
  for (const sample of samples) {
    const res = await request.get(sample.url, { timeout: 40000 });
    expect(res.ok(), "Official orchard photo should be downloadable").toBeTruthy();
    await page.locator("input[type=file]").setInputFiles({
      name: sample.name, mimeType: "image/jpeg", buffer: await res.body(),
    });
    await page.getByRole("button", { name: "Classify Apple (AI)" }).click();
    await expect(page.getByText("MODEL PREDICTION")).toBeVisible({ timeout: 90000 });
    // A specific fruit can be uncertain; it must not get a confident
    // "not an apple" declaration simply for being photographed on a phone.
    await expect(page.locator(".result h2")).not.toHaveText("Not an Apple");
  }
});
