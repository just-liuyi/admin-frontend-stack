import { defineConfig, devices } from "@playwright/test"

/**
 * 浏览器自动检查。运行：npm test（会自动构建并启动示例页）。
 * - 4173：普通构建（根路径），绝大多数检查用它
 * - 4174：按 GitHub Pages 的方式构建在 /admin-frontend-stack/ 子路径下，deploy.spec.ts 用它
 * 本机用已安装的 Edge；GitHub Actions 上用 Playwright 自带的 Chromium。
 */
const CI = !!process.env.CI

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: CI ? 2 : 4,
  retries: CI ? 1 : 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    locale: "zh-CN",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: CI ? undefined : "msedge" } }],
  webServer: [
    // ⚠️ --host 127.0.0.1：Linux 上 localhost 可能解析成 IPv6 的 ::1，等待 127.0.0.1 会一直超时（Windows 上不会出现）
    { command: "npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort", url: "http://127.0.0.1:4173", reuseExistingServer: !CI, timeout: 180_000, stdout: "pipe" },
    { command: "node tests/serve-pages.mjs", url: "http://127.0.0.1:4174/admin-frontend-stack/", reuseExistingServer: !CI, timeout: 180_000, stdout: "pipe" },
  ],
})
