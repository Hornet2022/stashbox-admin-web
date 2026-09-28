import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 配置 —— 端到端 happy path 套件。
 *
 * 设计要点：
 * - 只跑 chromium（其他浏览器按需 `pnpm exec playwright install` 后扩）
 * - 自动启 vite preview（构建产物，4173），复用仓库已有的 build 步骤
 * - 后端必须是 api-gateway@8100（真实登录，MSW 不在这里掺）
 * - 失败保留 trace + 截图 + 视频，方便排查
 */

const PORT = Number(process.env.E2E_PREVIEW_PORT ?? 4173)
const BASE_URL = `http://localhost:${PORT}`

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
    command: `pnpm preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 60_000,
  },
})