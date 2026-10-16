import { defineConfig, devices } from "@playwright/test";
import process from "node:process";
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173/ProduceAI/";
export default defineConfig({
  testDir: "./e2e",
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command:
          "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173/ProduceAI/",
        reuseExistingServer: false,
      },
  use: {
    baseURL,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "narrow",
      use: { browserName: "chromium", viewport: { width: 320, height: 800 } },
    },
  ],
});
