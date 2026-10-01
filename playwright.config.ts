import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 配置 —— 端到端 happy path 套件。
 *
 * 设计要点：
 * - 只跑 chromium（其他浏览器按需 `pnpm exec playwright install` 后扩）
 * - 自动 build + preview（VITE_API_BASE_URL 在构建期注入）
 * - **打的是 e2e 专用后端**（stashbox_e2e 库 / redis db 14 / :18100），
 *   不是生产 :8100 —— 以前直接打生产，一次全量跑往生产库灌了 51 个用户、
 *   49 篇文章、45 条软删音色，只能事后手工清。
 *   起后端：`bash e2e-backend.sh up`（或 `pnpm e2e:backend`）
 * - 失败保留 trace + 截图 + 视频，方便排查
 */

const PORT = Number(process.env.E2E_PREVIEW_PORT ?? 4174)
const BASE_URL = `http://localhost:${PORT}`
const E2E_API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:18100'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // 共享同一个 api-gateway，串行避免互相影响
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 7_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // 先 build 再 preview：VITE_API_BASE_URL 是**构建期**注入的，
    // 所以要指到 e2e 专用后端就必须重新构建一次。
    // 端口用 4174 避开 4173 —— 那个常被 `pnpm preview` 手动占着，
    // reuseExistingServer 会误复用上一轮指向生产后端的旧产物。
    command:
      `VITE_API_BASE_URL=${E2E_API_BASE_URL} pnpm build && ` +
      `pnpm preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 180_000,
  },
})