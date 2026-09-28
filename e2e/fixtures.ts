import { test as base, expect, type Page } from '@playwright/test'

/**
 * 通用登录 fixture —— 通过真实 UI 完成登录，再把页面交给用例。
 *
 * 设计：所有 happy path 用例都基于已登录态，避开每个 case 重复敲表单。
 * 凭证从环境变量取，默认 admin@stashbox.local / admin@stashbox123
 * （默认密码来自后端 seed migration 0015_seed_admin_email_password.py），
 * 用户可通过 E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD 在 CI 或本机覆盖。
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@stashbox.local'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin@stashbox123'

export { ADMIN_EMAIL, ADMIN_PASSWORD }

export type Role = 'admin' | 'super_admin' | 'operator' | 'viewer' | 'unknown'

export const test = base.extend<{
  authedPage: Page
  role: Role
}>({
  authedPage: async ({ page }, use) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await use(page)
  },

  role: async ({ authedPage }, use) => {
    const detected = await detectRole(authedPage)
    await use(detected)
  },
})

export { expect }

/**
 * 通过真实表单走一遍登录。
 * 后端返回 token 时已被 apiClient 拦截器写进 localStorage（stashbox_admin_token），
 * 并 setAuth(role, userId) 落到 Zustand + sessionStorage。
 */
export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('邮箱').fill(email)
  await page.getByLabel('密码').fill(password)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 }),
    page.getByRole('button', { name: '登录' }).click(),
  ])
}

/**
 * 从 sessionStorage 里读 admin_role —— Login 成功后 api/auth.ts 写入。
 * 兜底从 Header 文本读 role 字串（页面右上角会显示当前角色名）。
 */
export async function detectRole(page: Page): Promise<Role> {
  const fromStorage = await page.evaluate(() => sessionStorage.getItem('admin_role'))
  const candidate = (fromStorage ?? '').toLowerCase().trim()
  if (candidate === 'admin' || candidate === 'super_admin' ||
      candidate === 'operator' || candidate === 'viewer') {
    return candidate
  }
  return 'unknown'
}

/**
 * 清登录态 —— 用于 auth.spec / 需要重登的场景。
 */
export async function clearAuth(page: Page) {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}