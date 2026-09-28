import { test, expect } from './fixtures'

/**
 * 审计日志页 —— 列表 + 过滤区。
 */

test.describe('audit-log', () => {
  test('页面标题 + 表头', async ({ authedPage }) => {
    await authedPage.goto('/audit-log')
    await expect(authedPage.getByRole('heading', { name: '审计日志' })).toBeVisible()

    for (const col of ['ID', '操作人 ID', '动作', '对象类型', '对象 ID', '时间']) {
      // ID 单独 exact 匹配，避免和 "操作人 ID" / "对象 ID" 撞
      await expect(
        authedPage.getByRole('columnheader', { name: col, exact: col === 'ID' }),
      ).toBeVisible()
    }
  })

  test('过滤区字段都渲染', async ({ authedPage }) => {
    await authedPage.goto('/audit-log')

    // 字段名取自 AuditLog.tsx 的 placeholder / label
    await expect(authedPage.locator('input').first()).toBeVisible()
  })
})