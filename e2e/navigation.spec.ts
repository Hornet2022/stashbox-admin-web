import { test, expect } from './fixtures'

/**
 * 侧边栏导航 —— 5 个核心页互跳。
 */

test.describe('sidebar navigation', () => {
  for (const path of ['/dashboard', '/users', '/tags', '/articles', '/push-notifications', '/audit-log']) {
    test(`通过侧边栏跳转 ${path}`, async ({ authedPage, role }) => {
      // /users 仅 super_admin 可访问
      if (path === '/users' && role !== 'super_admin') {
        test.skip(true, '非 super_admin 跳过 /users 跳转测试')
      }

      await authedPage.goto('/dashboard')
      // 侧边栏链接
      await authedPage.locator(`a[href="${path}"]`).first().click()
      await expect(authedPage).toHaveURL(new RegExp(path))
    })
  }
})