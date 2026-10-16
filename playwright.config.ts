import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const webkitTrace = { mode: "retain-on-failure", snapshots: false, screenshots: false } as const;

/**
 * E2E + fidelity tests run against a production build made with ?freeze enabled
 * (NEXT_PUBLIC_ALLOW_FREEZE=1), so screenshots and timings match what ships.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    // WebKit is far slower at the trace's per-action DOM snapshots (a 7s test took >90s), so its
    // traces keep the action log, console and network only.
    { name: "safari-desktop", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 }, trace: webkitTrace } },
    { name: "iphone", use: { ...devices["iPhone 15"], trace: webkitTrace } },
  ],
  webServer: {
    command: `npm run build:test && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
