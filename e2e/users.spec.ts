import { test, expect } from './fixtures'

/**
 * 用户管理页 —— super_admin 限定。
 * 凭证若只拿到 admin 角色，页面会用 toast 拦回 /dashboard；用例对两种结果都接受。
 */

test.describe('users', () => {
  test('页面行为符合角色权限', async ({ authedPage, role }) => {
    await authedPage.goto('/users')

    if (role === 'super_admin') {
      // 工具栏可见（搜索框 + 重置 + 导出 + 刷新）
      await expect(authedPage.getByRole('heading', { name: '用户管理' })).toBeVisible()
      await expect(authedPage.getByPlaceholder('搜索邮箱/昵称/ID')).toBeVisible()
    } else {
      // 非 super_admin → 被路由守卫拦回 /dashboard
      await expect(authedPage).toHaveURL(/\/dashboard/)
      await expect(authedPage.getByText(/权限不足/)).toBeVisible()
    }
  })

  test('super_admin 可打开配额调整 Modal', async ({ authedPage, role }) => {
    test.skip(role !== 'super_admin', '当前账号不是 super_admin，跳过配额 Modal 用例')

    await authedPage.goto('/users')

    // 等表格加载完成（任意行的"调整配额"按钮可见）
    const adjustBtn = authedPage.getByRole('button', { name: '调整配额' }).first()
    await adjustBtn.waitFor({ state: 'visible', timeout: 10_000 })

    await adjustBtn.click()

    // Modal 标题含 "调整配额"
    await expect(authedPage.getByRole('heading', { name: /调整配额/ })).toBeVisible()
    // 字段
    await expect(authedPage.getByLabel('月配额（次）')).toBeVisible()
    await expect(authedPage.getByLabel('调整原因')).toBeVisible()
    // 取消按钮关闭 Modal
    await authedPage.getByRole('button', { name: '取消' }).click()
    await expect(authedPage.getByRole('heading', { name: /调整配额/ })).not.toBeVisible()
  })
})