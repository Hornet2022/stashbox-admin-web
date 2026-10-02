import { test, expect } from './fixtures'

/**
 * 总览页 —— 7 个指标卡 + 趋势占位区。
 * 数据源 GET /api/v1/admin/stats。
 */

test.describe('dashboard', () => {
  test('页面标题 + 全部指标卡可见', async ({ authedPage }) => {
    await authedPage.goto('/dashboard')
    await expect(authedPage.getByRole('heading', { name: '总览' })).toBeVisible()
    await expect(
      authedPage.getByText('内容生产与消费的当前水位。先看需要处理的，再看存量。')
    ).toBeVisible()

    // 指标卡。⚠️ 这里是 8 张不是 7 张 —— 早就补过一张「蒸馏成功率」，
    // 用例里的清单一直没收，于是先在少的那张上就挂了。
    // 卡片按「需要处理 / 规模存量」分成两组（8 张等权重的卡等于没有层级），
    // 其中两张改了名：蒸馏队列中→等待蒸馏、活跃音频→可用音频。
    const labels = [
      '24h 蒸馏失败',
      '等待蒸馏',
      '蒸馏成功率',
      '用户总数',
      '文章总数',
      '已收听',
      '可用音频',
      '本月营收',
    ]
    for (const label of labels) {
      await expect(authedPage.getByText(label, { exact: true })).toBeVisible()
    }

    // 趋势区。原来这里断言的是「近 7 天用户增长」+「用户增长趋势端点待上线」，
    // 但端点早就上线、这块也重写成了 4 张柱状图（Dashboard.tsx:289-315），
    // 两条断言都在 src/ 里找不到，属于历史遗留。
    await expect(authedPage.getByText('近 7 天趋势')).toBeVisible()
    await expect(
      authedPage.getByText('按天分桶，柱子相对当天峰值归一'),
    ).toBeVisible()
    for (const title of ['新增文章', '新增用户', '蒸馏完成']) {
      await expect(authedPage.getByText(title, { exact: true })).toBeVisible()
    }
  })

  test('指标卡最终渲染出数字或 —（容错）', async ({ authedPage }) => {
    await authedPage.goto('/dashboard')
    // 等接口响应：所有卡片要么显示数字（千分位），要么显示 —
    await expect(authedPage.getByText('用户总数', { exact: true })).toBeVisible()
    // 等 stats 接口真正回来。
    //
    // 原来这里等的是页面上的 'GET /api/v1/admin/stats' 脚注文案，
    // 两个问题叠在一起：① 少写了 /api/v1，永远匹配不上，必然超时；
    // ② 那个脚注是「API 端点泄露」，上一轮已经按业务语言重写删掉了。
    // 改成等真实 DOM 状态：loading 时卡片渲染 Skeleton，数据回来才渲染
    // .tnum-clip 的值（数字或 —）。文案会变，Skeleton→值的切换不会。
    await expect(authedPage.locator('.tnum-clip').first()).toBeVisible({ timeout: 10_000 })
  })
})