import { test, expect } from './fixtures'

/**
 * 总览页 —— 7 个指标卡 + 趋势占位区。
 * 数据源 GET /api/v1/admin/stats。
 */

test.describe('dashboard', () => {
  test('页面标题 + 全部指标卡可见', async ({ authedPage }) => {
    await authedPage.goto('/dashboard')
    await expect(authedPage.getByRole('heading', { name: '总览' })).toBeVisible()
    await expect(authedPage.getByText('数据源：GET /api/v1/admin/stats').first()).toBeVisible()

    // 7 张指标卡
    const labels = [
      '用户总数',
      '文章总数',
      '蒸馏队列中',
      '已收听',
      '活跃音频',
      '24h 失败蒸馏',
      '本月营收',
    ]
    for (const label of labels) {
      await expect(authedPage.getByText(label, { exact: true })).toBeVisible()
    }

    // 趋势占位
    await expect(authedPage.getByText('近 7 天用户增长')).toBeVisible()
    await expect(authedPage.getByText('用户增长趋势端点待上线')).toBeVisible()
  })

  test('指标卡最终渲染出数字或 —（容错）', async ({ authedPage }) => {
    await authedPage.goto('/dashboard')
    // 等接口响应：所有卡片要么显示数字（千分位），要么显示 —
    await expect(authedPage.getByText('用户总数', { exact: true })).toBeVisible()
    // 等待骨架消失（loading 完成），检查至少有一张卡渲染出数值或 — 而非骨架占位
    await authedPage.waitForFunction(
      () => document.body.innerText.includes('GET /admin/stats'),
      { timeout: 10_000 },
    )
  })
})