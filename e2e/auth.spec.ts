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
    // 2026-10-03：原来这里断言 `page.locator('text=登录')` 可见。
    // 那条断言**从来没有验证过错误提示** —— 按钮上的「登录」二字
    // 无条件可见，所以无论后端返回什么都不通过；它甚至匹配到了
    // 副标题「运营管理后台登录」，是一条恒真断言。
    // 改为断言真正的错误区：role="alert" 的那段文案。
    // 登录失败只在表单内联报错，不再重复弹 toast（同一句话出现两次
    // 只会让人怀疑是不是出了两个错），所以这里同时锁住「不产生 toast」。
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('alert')).not.toBeEmpty()
    await expect(page.locator('[aria-live="polite"] .t-toast')).toHaveCount(0)
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