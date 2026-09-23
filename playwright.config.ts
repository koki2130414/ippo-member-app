import { defineConfig, devices } from "@playwright/test";

// この環境には Chromium が同梱済みなので、あればそれを使う（無ければ Playwright 既定の場所）
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    ...(chromiumExecutable ? { launchOptions: { executablePath: chromiumExecutable } } : {}),
  },
  // 仕様 11章: モバイルとデスクトップの2プロジェクト。生徒の大半はスマホで使う想定
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // E2E は必ずサンプルデータで回す（毎回同じ状態から始めるため。仕様 10.7）
    command: "IPPO_SEED=sample npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
