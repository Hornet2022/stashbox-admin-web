import { test, expect } from './fixtures'

/**
 * 标签管理页 —— 列表 + 权限允许时的新增/删除按钮。
 */

test.describe('tags', () => {
  test('页面标题 + 表头', async ({ authedPage }) => {
    await authedPage.goto('/tags')
    await expect(authedPage.getByRole('heading', { name: '标签管理' })).toBeVisible()
    await expect(authedPage.getByText('数据源：GET /api/v1/tags')).toBeVisible()

    for (const col of ['ID', '名称', '描述', '订阅数', '创建时间', '操作']) {
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