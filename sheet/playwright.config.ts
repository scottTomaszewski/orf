import { defineConfig } from "@playwright/test";

/**
 * Browser tests for the sheet: visual snapshots (e2e/visual.spec.ts), the write→play ripple
 * (e2e/ripple.spec.ts), and the demo recording (e2e/demo.spec.ts, project "demo" only).
 * The app under test is the production build served by `vite preview`.
 */
const PORT = 4181;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  // One baseline per project, no platform suffix: web fonts come from Google Fonts and Chromium is
  // Playwright's own build, so Linux CI and a Linux desktop agree. Update with `npm run e2e:update`.
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  expect: { toHaveScreenshot: { maxDiffPixels: 200, animations: "disabled", caret: "hide" } },
  use: { baseURL: `http://localhost:${PORT}/`, trace: "retain-on-failure", colorScheme: "dark" },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } }, testIgnore: /demo\.spec\.ts/ },
    { name: "phone", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, testIgnore: /demo\.spec\.ts/ },
    { name: "demo", testMatch: /demo\.spec\.ts/, use: { browserName: "chromium", viewport: { width: 1280, height: 800 }, video: { mode: "on", size: { width: 1280, height: 800 } } } },
  ],
});
