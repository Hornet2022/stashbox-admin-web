import { test, expect, canWrite } from './fixtures'

/**
 * 侧边栏导航 —— 5 个核心页互跳。
 */

test.describe('sidebar navigation', () => {
  for (const path of ['/dashboard', '/users', '/tags', '/articles', '/push-notifications', '/audit-log']) {
    test(`通过侧边栏跳转 ${path}`, async ({ authedPage, role }) => {
      // /users 需要写权限。判据用共享的 canWrite —— 原先写 `role !==
      // 'super_admin'`，而 super_admin 不是后端会产生的角色值，条件恒真，
      // 于是 /users 的跳转测试从来没跑过。
      if (path === '/users' && !canWrite(role)) {
        test.skip(true, `角色 ${role} 无写权限，跳过 /users 跳转测试`)
      }

      await authedPage.goto('/dashboard')
      // 侧边栏链接
      await authedPage.locator(`a[href="${path}"]`).first().click()
      await expect(authedPage).toHaveURL(new RegExp(path))
    })
  }
})