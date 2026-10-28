import { defineConfig, devices } from "@playwright/test";
const localPort = process.env.STARSHIP_DEV_PORT ?? "5173";
export default defineConfig({
  testDir: "tests",
  testMatch: process.env.STARSHIP_TEST_BASE_URL
    ? "deployed.spec.ts"
    : ["ui.spec.ts", "crew-ui.spec.ts", "title.spec.ts", "multiplayer-ui.spec.ts"],
  use: {
    baseURL: process.env.STARSHIP_TEST_BASE_URL ?? `http://127.0.0.1:${localPort}`,
    channel: process.env.STARSHIP_BROWSER_CHANNEL,
  },
  webServer: process.env.STARSHIP_TEST_BASE_URL
    ? undefined
    : {
        command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${localPort} --strictPort`,
        url: `http://127.0.0.1:${localPort}`,
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
