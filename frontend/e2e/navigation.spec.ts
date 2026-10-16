import { test, expect } from "@playwright/test";
test("all routes render under the repository base path without overflow", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: /Intelligent Apple/ }),
  ).toBeVisible();
  for (const route of [
    "ai-scanner",
    "model-comparison",
    "analytics",
    "research",
    "about",
  ]) {
    await page.goto("./#/" + route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
test("scanner never fabricates a prediction when disconnected", async ({
  page,
}) => {
  await page.route("**/models/manifest.json", (route) =>
    route.fulfill({ status: 404, body: "No model" }),
  );
  await page.route("**/health", (route) =>
    route.fulfill({ json: { status: "ok", model_loaded: false } }),
  );
  await page.goto("./#/ai-scanner");
  await expect(
    page.getByText("Model Not Connected", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Screen Image (Experimental)" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Every result starts with an image"),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "invalid.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    });
  await expect(page.getByRole("alert")).toContainText("JPEG, PNG, or WebP");
  await expect(
    page.getByRole("button", { name: "Screen Image (Experimental)" }),
  ).toBeDisabled();
});
