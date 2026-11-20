import { defineConfig, devices } from "@playwright/test";

const previewCommand = (example: string, port: number): string =>
  `pnpm --filter @zealakit/pattern-input-${example}-example exec vite preview --host 127.0.0.1 --port ${port} --strictPort`;

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"]],
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command: previewCommand("vanilla", 4173),
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: previewCommand("react", 4174),
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: previewCommand("vue", 4175),
      url: "http://127.0.0.1:4175",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: previewCommand("svelte", 4176),
      url: "http://127.0.0.1:4176",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @zealakit/pattern-input-nextjs-example run start",
      url: "http://127.0.0.1:3010",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
    },
  ],
});
