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

    // 指标卡。⚠️ 这里是 8 张不是 7 张 —— 早就补过一张「蒸馏成功率」，
    // 用例里的清单一直没收，于是先在少的那张上就挂了。
    const labels = [
      '用户总数',
      '文章总数',
      '蒸馏队列中',
      '已收听',
      '活跃音频',
      '24h 蒸馏失败',
      '本月营收',
      '蒸馏成功率',
    ]
    for (const label of labels) {
      await expect(authedPage.getByText(label, { exact: true })).toBeVisible()
    }

    // 趋势区。原来这里断言的是「近 7 天用户增长」+「用户增长趋势端点待上线」，
    // 但端点早就上线、这块也重写成了 4 张柱状图（Dashboard.tsx:289-315），
    // 两条断言都在 src/ 里找不到，属于历史遗留。
    await expect(authedPage.getByText('近 7 天趋势')).toBeVisible()
    await expect(
      authedPage.getByText('按 day 分桶；空日显示 0；柱子相对当天最大值归一'),
    ).toBeVisible()
    for (const title of ['新增文章', '新增用户', '蒸馏完成']) {
      await expect(authedPage.getByText(title, { exact: true })).toBeVisible()
    }
  })

  test('指标卡最终渲染出数字或 —（容错）', async ({ authedPage }) => {
    await authedPage.goto('/dashboard')
    // 等接口响应：所有卡片要么显示数字（千分位），要么显示 —
    await expect(authedPage.getByText('用户总数', { exact: true })).toBeVisible()
    // 等数据源标签出现 = stats 接口已回、loading 已结束（原来这里等的是
    // 'GET /admin/stats'，少了 /api/v1，永远匹配不上，必然超时）
    await authedPage.waitForFunction(
      () => document.body.innerText.includes('GET /api/v1/admin/stats'),
      { timeout: 10_000 },
    )
  })
})