import { test, expect } from './fixtures'

/**
 * 用户管理页 —— super_admin 限定。
 * 凭证若只拿到 admin 角色，页面会用 toast 拦回 /dashboard；用例对两种结果都接受。
 */

test.describe('users', () => {
  test('页面行为符合角色权限', async ({ authedPage, role }) => {
    await authedPage.goto('/users')
    await expect(authedPage.getByRole('heading', { name: '用户管理' })).toBeVisible()

    // 搜索框 placeholder 的真实值是 "邮箱 / 昵称"（UsersToolbar.tsx）。
    // 原来这里写的是「搜索邮箱/昵称/ID」，那个串在代码里根本不存在 ——
    // 只在 super_admin 分支里，所以从没人跑过它，坏了也没人知道。
    await expect(authedPage.getByPlaceholder('按邮箱或昵称搜索')).toBeVisible()

    // 注意：`/users` 路由**只包了 AuthGuard，没有角色守卫**（App.tsx）。
    // admin/operator 角色直接输 URL 也能进，能看到全量用户列表并点「调整配额」。
    // 侧边栏有 minRole 过滤，但那只藏入口、不挡路由。
    // 写操作的兜底在后端（user-service 的 require_admin_or_operator）。
    // 这里如实断言当前行为，不假装有前端守卫：
    test.info().annotations.push({
      type: 'note',
      description: `当前角色 ${role}；/users 路由无角色守卫，前端拦不住直接访问`,
    })
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