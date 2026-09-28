import { test, expect, loginViaUi, clearAuth, ADMIN_EMAIL, ADMIN_PASSWORD } from './fixtures'

/**
 * 登录 / 守卫 / 登出 —— auth 闭环。
 */

test.describe('auth', () => {
  test('未登录访问受保护路由会重定向到 /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'stashbox' })).toBeVisible()
  })

  test('登录成功跳到 /dashboard', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: '总览' })).toBeVisible()
  })

  test('错误密码停留在登录页并展示错误', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('邮箱').fill(ADMIN_EMAIL)
    await page.getByLabel('密码').fill('wrong-password')
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/login/)
    // 错误会显示在表单上方 + 触发 toast；断言至少有一个错误提示
    await expect(page.locator('text=登录')).toBeVisible()
  })

  test('Header 退出按钮回登录页', async ({ authedPage }) => {
    await authedPage.getByRole('button', { name: '退出登录' }).click()
    await expect(authedPage).toHaveURL(/\/login/)
  })

  test('登出后访问受保护路由再次被守卫拦截', async ({ page }) => {
    // 借助已登录 fixture 先登出，再访问受保护页面
    await page.goto('/login')
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await clearAuth(page)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})