import { defineConfig } from "@playwright/test";

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      threshold: 0,
    },
  },
  fullyParallel: false,
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  reporter: [["line"]],
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
  testDir: "./tests",
  use: {
    actionTimeout: 10_000,
    trace: "retain-on-failure",
    viewport: { height: 768, width: 1024 },
  },
  workers: 1,
});
