import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: process.env.STARSHIP_TEST_BASE_URL
    ? "deployed.spec.ts"
    : ["ui.spec.ts", "crew-ui.spec.ts"],
  use: {
    baseURL: process.env.STARSHIP_TEST_BASE_URL ?? "http://127.0.0.1:5173",
  },
  webServer: process.env.STARSHIP_TEST_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 5173",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
      },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
