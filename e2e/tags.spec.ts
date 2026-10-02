import { test, expect } from './fixtures'

/**
 * 标签管理页 —— 列表 + 权限允许时的新增/删除按钮。
 */

test.describe('tags', () => {
  test('页面标题 + 表头', async ({ authedPage }) => {
    await authedPage.goto('/tags')
    await expect(authedPage.getByRole('heading', { name: '标签管理' })).toBeVisible()
    await expect(
      authedPage.getByText('蒸馏对齐文章结构的基础标签集。系统标签参与改写，不能删除')
    ).toBeVisible()
    await expect(authedPage.getByText(/数据源：GET/)).toHaveCount(0)

    // 表头。⚠️ 这里原来还断言了一列「描述」，但这个字段**根本不存在**：
    // TagRow（src/types/index.ts:112）只有 id/slug/category/is_system/name/
    // subscriber_count/created_at，后端 /api/v1/tags 也不返回 description，
    // 新增标签表单只有「名称」和「标识（slug）」两个输入框。
    // 也就是说那一列从头到尾都是空的 —— 用例断言的是一个虚构契约。
    for (const col of ['ID', '名称', '订阅数', '创建时间', '操作']) {
      await expect(authedPage.getByRole('columnheader', { name: col })).toBeVisible()
    }
  })

  test('操作按钮可见性受角色控制', async ({ authedPage, role }) => {
    await authedPage.goto('/tags')

    if (role === 'super_admin' || role === 'operator') {
      await expect(authedPage.getByRole('button', { name: '新增标签' })).toBeVisible()
      await expect(authedPage.locator('button[aria-label^="删除标签"]').first()).toBeVisible()
    } else {
      await expect(authedPage.getByRole('button', { name: '新增标签' })).not.toBeVisible()
    }
  })

  test('导出按钮始终可见（不依赖操作权限）', async ({ authedPage }) => {
    await authedPage.goto('/tags')
    await expect(authedPage.getByRole('button', { name: '导出 CSV' })).toBeVisible()
  })
})