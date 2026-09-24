import { defineConfig, devices } from "@playwright/test";

// Browser tests for the booking flow. The Supabase backend is mocked in
// e2e/mockBackend.ts, so these run offline and never touch real data.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 }, // first loads on a cold Vite dev server are slow
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:5199",
    locale: "en-GB",
    trace: "retain-on-failure",
    serviceWorkers: "block", // the PWA worker would cache around the mocks
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npx vite --port 5199 --strictPort",
    url: "http://localhost:5199",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
