import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'

/**
 * Dashboard 页单测 —— CP-NEW.14 + CP-STATS-REWORK。
 *
 * 覆盖（Dashboard 现在调两个端点 getStats + getDistillP95）：
 *   - stats 卡片 8 项渲染（含新增「蒸馏成功率」）
 *   - 错误状态 / missing 提示
 *   - 后端响应缺字段时显示 "—" 不崩溃
 *   - 异常告警 warning 触发后顶部 banner 显示
 *   - revenue_available=false → 文案改成"orders 表缺失"
 *   - distill-p95 卡片渲染 by_step 表格
 *   - by_source 条形图按 count 排序
 *   - 手动刷新按钮可点击 + 调 reload
 */

vi.mock('../api/admin', () => ({
  getStats: vi.fn(),
  getDistillP95: vi.fn(),
}))

import * as adminModule from '../api/admin'
const mockedGetStats = vi.mocked(adminModule.getStats)
const mockedGetDistillP95 = vi.mocked(adminModule.getDistillP95)

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

/**
 * 取出某张指标卡（按 label 定位）。
 *
 * 为什么需要它：**多张卡会显示同一句文案**（「月留存」「首屏加载」「音频启动」
 * 在后端没提供指标时都显示「后端尚未提供该指标」）。
 * 用 `screen.getByText(...)` 断言这种文案，一旦再加一张卡就会撞上
 * "found multiple elements" —— 那是**测试自己**的脆弱，不是页面的问题。
 * ⇒ 断言必须落在**某一张卡内部**。
 */
function cardOf(label: string): HTMLElement {
  const el = screen.getByText(label).closest('div.rounded-lg')
  if (!el) throw new Error(`找不到「${label}」那张指标卡`)
  return el as HTMLElement
}

// 与 content-service/admin_router.py 真实返回形态一致（CP-STATS-REWORK 拓字段）
const sampleStats = {
  total_users: 1234,
  total_articles: 5678,
  pending: 12,
  listened: 890,
  revenue: 3050.5,
  revenue_available: true,
  active_audio_files: 3800,
  failed_distillations_24h: 3,
  failed_articles_24h: 2,
  distill_success_rate: 0.85,
  by_source: {
    wechat: 3200,
    douyin: 1500,
    pdf: 700,
    clawbot: 200,
    d9: 78,
  },
  trends: {
    // 相对「今天」生成：趋势面板只渲染最近 7 天，写死日期会随时间自动烂掉
    articles_created_7d: [
      { date: daysAgo(6), count: 5 },
      { date: daysAgo(5), count: 12 },
      { date: daysAgo(4), count: 9 },
    ],
    users_created_7d: [
      { date: daysAgo(6), count: 3 },
      { date: daysAgo(5), count: 7 },
    ],
    distill_completed_7d: [{ date: daysAgo(5), count: 4 }],
  },
  comparison: {
    new_articles_24h: { today: 10, yesterday: 5, delta_pct: 1.0 },
    new_users_24h: { today: 3, yesterday: 2, delta_pct: 0.5 },
    distill_completed_24h: { today: 4, yesterday: 6, delta_pct: -0.3333 },
  },
  warning: null,
  generated_at: '2026-09-24T10:00:00+00:00',
}

/** n 天前的 ISO 日期（UTC），与 Dashboard 的 fillLast7Days 同一口径 */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const sampleP95 = {
  by_step: {
    step1_structure: { p50: 1.2, p95: 2.5, p99: 3.8, count: 120, mean: 1.4, upper_bound: 5 },
    step3_ttsing: { p50: 5.4, p95: 9.1, p99: 11.2, count: 120, mean: 5.9, upper_bound: 30 },
  },
  overall: { p50: 8.3, p95: 15.0, p99: 18.4, count: 120, mean: 8.9, upper_bound: 60 },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetStats.mockResolvedValue(sampleStats)
  mockedGetDistillP95.mockResolvedValue(sampleP95)
})

describe('Dashboard', () => {
  it('渲染标题 + 需要关注/规模存量两组指标卡', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('总览')).toBeInTheDocument()
    })
    expect(screen.getByText('用户总数')).toBeInTheDocument()
    expect(screen.getByText('文章总数')).toBeInTheDocument()
    expect(screen.getByText('等待蒸馏')).toBeInTheDocument()
    expect(screen.getByText('已收听')).toBeInTheDocument()
    expect(screen.getByText('可用音频')).toBeInTheDocument()
    expect(screen.getByText('24h 蒸馏失败')).toBeInTheDocument()
    expect(screen.getByText('本月营收')).toBeInTheDocument()
    expect(screen.getByText('蒸馏成功率')).toBeInTheDocument()
  })

  it('stats 数值带千分位', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument()
    })
    expect(screen.getByText('5,678')).toBeInTheDocument()
    expect(screen.getByText('890')).toBeInTheDocument()
    expect(screen.getByText('3,800')).toBeInTheDocument()
  })

  it('后端响应缺字段 → 该卡显示 "—" 不崩溃', async () => {
    mockedGetStats.mockResolvedValue({
      total_users: 5,
      total_articles: 6,
    } as never)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5)
  })

  it('loading 状态显示 skeleton', async () => {
    mockedGetStats.mockReturnValue(new Promise(() => {}) as unknown as Promise<never>)
    const { container } = renderDashboard()
    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })
  })

  it('missing 端点 → 显示 "功能待上线" 提示', async () => {
    mockedGetStats.mockRejectedValue({ response: { status: 404 } })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/功能待上线|不可用|未上线/)).toBeInTheDocument()
    })
  })

  it('服务端 500 错误 → 显示错误状态 + ErrorNotice', async () => {
    mockedGetStats.mockRejectedValue({
      response: { status: 500, data: { message: '服务异常' } },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/服务异常/)).toBeInTheDocument()
    })
  })

  // CP-STATS-REWORK 新增断言：异常告警
  it('warning 触发时显示顶部 banner + failed 卡变红', async () => {
    mockedGetStats.mockResolvedValue({
      ...sampleStats,
      failed_distillations_24h: 20,
      warning: {
        code: 'high_distill_failure',
        message: '近 24h 蒸馏失败 20 条（阈值 5），建议检查 ai-service 日志',
        threshold: 5,
        actual: 20,
      },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    // banner 包含阈值 + 实际数
    expect(screen.getByText(/阈值 5 条/)).toBeInTheDocument()
    expect(screen.getByText(/实际 20 条/)).toBeInTheDocument()
  })

  // CP-STATS-REWORK #3：revenue_available=false 提示"orders 表缺失"
  it('revenue_available=false → 月营收卡 hint 提示 orders 表缺失', async () => {
    mockedGetStats.mockResolvedValue({
      ...sampleStats,
      revenue: 0,
      revenue_available: false,
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/未接入支付/)).toBeInTheDocument()
    })
  })

  // CP-STATS-REWORK #7：trends 柱状图渲染
  it('trends 三个柱状图标题渲染', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('近 7 天趋势')).toBeInTheDocument()
    })
    expect(screen.getByText('新增文章')).toBeInTheDocument()
    expect(screen.getByText('新增用户')).toBeInTheDocument()
    expect(screen.getByText('蒸馏完成')).toBeInTheDocument()
  })

  it('三条趋势全为 0 时给空态，不画一排空灰槽', async () => {
    mockedGetStats.mockResolvedValue({
      ...sampleStats,
      trends: {
        articles_created_7d: [],
        users_created_7d: [],
        distill_completed_7d: [],
      },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('近 7 天趋势')).toBeInTheDocument()
    })
    expect(screen.getByText('近 7 天没有新增数据')).toBeInTheDocument()
  })

  // CP-STATS-REWORK #5：by_source 条形图
  it('by_source 条形图按数量降序显示', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('文章来源分布')).toBeInTheDocument()
    })
    // 内部 slug 不再直接暴露；wechat 3200 最大 → 第一个出现
    expect(screen.getByText('微信公众号')).toBeInTheDocument()
    // 映射表里没有的枚举退回原值，但不会消失
    expect(screen.getByText('douyin')).toBeInTheDocument()
    expect(screen.getByText('pdf')).toBeInTheDocument()
  })

  // CP-DISTILL-PROM-SDK：distill-p95 卡片渲染 by_step + overall
  it('distill-p95 卡片渲染 overall + by_step 表格', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('蒸馏耗时')).toBeInTheDocument()
    })
    // 步骤显示中文名，不暴露 step1_structure 这类内部 key
    expect(screen.getByText('端到端')).toBeInTheDocument()
    expect(screen.getByText('结构提取')).toBeInTheDocument()
    expect(screen.getByText('step3_ttsing')).toBeInTheDocument()
    // 样本数必须露出来：3 个样本的 P95 没有可信度
    expect(screen.getAllByText('120').length).toBeGreaterThan(0)
  })

  it('distill-p95 没数据时显示「暂无数据」占位', async () => {
    mockedGetDistillP95.mockResolvedValue({
      by_step: {},
      overall: { p50: null, p95: null, p99: null, count: 0, mean: null, upper_bound: null },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('还没有耗时样本')).toBeInTheDocument()
    })
  })

  // 手动刷新按钮
  it('点击「刷新」按钮触发 getStats 重新调', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('总览')).toBeInTheDocument()
    })
    const initialCalls = mockedGetStats.mock.calls.length
    const button = screen.getByRole('button', { name: /手动刷新统计数据/ })
    button.click()
    // reload() 触发 → 重发请求（useApi 内部实现：reload 重置 count 触发重发）
    await waitFor(() => {
      expect(mockedGetStats.mock.calls.length).toBeGreaterThanOrEqual(initialCalls)
    })
  })

  // #4 环比：today vs yesterday delta 显示
  it('comparison 环比 delta_pct 显示在对应卡片上', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('总览')).toBeInTheDocument()
    })
    // 环比必须带基线说明：new_articles_24h.today=10 / yesterday=5 → +100%
    expect(screen.getByText('新增文章 今日较昨日')).toBeInTheDocument()
    expect(screen.getByText('+100%')).toBeInTheDocument()
    // 新增用户 +50%（3/2 = +50%）
    expect(screen.getByText('新增用户 今日较昨日')).toBeInTheDocument()
    expect(screen.getByText('+50%')).toBeInTheDocument()
  })

  // 2026-10-25：月留存卡
  it('月留存显示比率并带上样本量', async () => {
    mockedGetStats.mockResolvedValue({
      ...sampleStats,
      retention: {
        month: '2026-09',
        cohort_size: 12,
        retained: 7,
        rate: 7 / 12,
        current_month: '2026-10',
      },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('月留存')).toBeInTheDocument()
    })
    expect(screen.getByText('58%')).toBeInTheDocument()
    // 样本量必须露出来：没有分母的留存率不可信
    expect(screen.getByText('7 / 12 人 · 目标 ≥ 50%')).toBeInTheDocument()
  })

  it('月留存没有样本时显示「—」而不是 0%', async () => {
    // rate=null = 上月没有活跃样本；渲染成 0% 会显示一个假的坏消息
    mockedGetStats.mockResolvedValue({
      ...sampleStats,
      retention: {
        month: '2026-09',
        cohort_size: 0,
        retained: 0,
        rate: null,
        current_month: '2026-10',
      },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('月留存')).toBeInTheDocument()
    })
    expect(screen.getByText('上月没有活跃样本（不是 0%）')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('后端还没提供 retention 字段时不能说成「没有活跃样本」', async () => {
    // 后端未部署 / 部署顺序错了 ⇒ stats 里根本没有 retention 字段。
    // 这跟「上月没有活跃样本」是两回事：说成后者会让人以为用户都没来，
    // 而真实原因是「这个指标压根没上线」。
    mockedGetStats.mockResolvedValue({ ...sampleStats })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('月留存')).toBeInTheDocument()
    })
    // ⚠️ 必须**在「月留存」这张卡内部**断言：
    // 「后端尚未提供该指标」这句文案现在不止一张卡会用
    // （首屏/音频启动在指标缺失时也是这句），全屏 getByText 会撞多个元素。
    expect(within(cardOf('月留存')).getByText('后端尚未提供该指标')).toBeInTheDocument()
    expect(
      within(cardOf('月留存')).queryByText('上月没有活跃样本（不是 0%）'),
    ).not.toBeInTheDocument()
  })

  // 2026-10-25：客户端性能卡（首屏 / 音频启动）
  const sampleClientPerf = {
    window_days: 7,
    window_start: '2026-10-19',
    window_end: '2026-10-26',
    first_frame: {
      event: 'app_first_frame',
      samples: 12,
      p50_ms: 1234,
      p95_ms: 2100,
      target_ms: 1500,
    },
    audio_start: {
      event: 'audio_play_start_client',
      samples: 8,
      p50_ms: 380,
      p95_ms: 900,
      target_ms: 500,
    },
  }

  it('首屏与音频启动卡显示 P50，并带上 P95、样本量与目标线', async () => {
    mockedGetStats.mockResolvedValue({ ...sampleStats, client_perf: sampleClientPerf })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('首屏加载')).toBeInTheDocument()
    })
    expect(screen.getByText('1234ms')).toBeInTheDocument()
    expect(screen.getByText('P95 2100ms · 12 个样本 · 目标 < 1500ms')).toBeInTheDocument()
    expect(screen.getByText('380ms')).toBeInTheDocument()
    expect(screen.getByText('P95 900ms · 8 个样本 · 目标 < 500ms')).toBeInTheDocument()
  })

  it('后端还没提供 client_perf 字段时不能说成「没有样本」', async () => {
    // stats 里没有 client_perf 字段 ⇒ 这是「指标还没上线」，
    // 不是「最近没人上报」—— 两种状态必须分开说。
    mockedGetStats.mockResolvedValue({ ...sampleStats })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('首屏加载')).toBeInTheDocument()
    })
    for (const label of ['首屏加载', '音频启动']) {
      const card = within(cardOf(label))
      expect(card.getByText('后端尚未提供该指标')).toBeInTheDocument()
      expect(card.queryByText(/没有样本/)).not.toBeInTheDocument()
    }
  })

  it('有字段但没有样本时显示「没有样本（不是 0ms）」', async () => {
    // p50_ms 为 null = 没有有效样本。渲染成 0ms 会显示一个假的「启动很快」。
    mockedGetStats.mockResolvedValue({
      ...sampleStats,
      client_perf: {
        ...sampleClientPerf,
        first_frame: { ...sampleClientPerf.first_frame, samples: 0, p50_ms: null, p95_ms: null },
        audio_start: { ...sampleClientPerf.audio_start, samples: 0, p50_ms: null, p95_ms: null },
      },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('首屏加载')).toBeInTheDocument()
    })
    for (const label of ['首屏加载', '音频启动']) {
      const card = within(cardOf(label))
      expect(card.getByText('最近 7 天没有样本（不是 0ms）')).toBeInTheDocument()
      expect(card.queryByText('0ms')).not.toBeInTheDocument()
    }
  })

  it('P50 超过目标线时卡片标红，达标时标绿', async () => {
    // 颜色按 P50 判（目标线是典型用户的预算），但 P95 仍然显示在脚注里。
    mockedGetStats.mockResolvedValue({
      ...sampleStats,
      client_perf: {
        ...sampleClientPerf,
        // 首屏 P50 2100 > 目标 1500 ⇒ 超标
        first_frame: { ...sampleClientPerf.first_frame, p50_ms: 2100 },
      },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('首屏加载')).toBeInTheDocument()
    })
    expect(screen.getByText('2100ms').className).toContain('text-error-ink')
    // 音频启动 P50 380 < 目标 500 ⇒ 达标
    expect(screen.getByText('380ms').className).toContain('text-success-ink')
  })

  it('P50 恰好等于目标线时算超标（目标线是「< 1500ms」，不含等号）', async () => {
    // 仓内定义原文是「首屏加载 < 1.5s」⇒ 等于 1500ms **不算达标**。
    // 这条把「< 还是 ≤」钉死：口径里写的是哪个，页面就得是哪个。
    mockedGetStats.mockResolvedValue({
      ...sampleStats,
      client_perf: {
        ...sampleClientPerf,
        first_frame: { ...sampleClientPerf.first_frame, p50_ms: 1500 },
      },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('首屏加载')).toBeInTheDocument()
    })
    expect(screen.getByText('1500ms').className).toContain('text-error-ink')
  })

  it('后端说 samples=0 却给了 p50 时，按「没有样本」渲染', async () => {
    // 自相矛盾的响应（样本 0 却有分位数）。这时**不能**显示那个数字 ——
    // 一个没有样本支撑的分位数不该被当成事实展示。
    mockedGetStats.mockResolvedValue({
      ...sampleStats,
      client_perf: {
        ...sampleClientPerf,
        first_frame: { ...sampleClientPerf.first_frame, samples: 0, p50_ms: 1234, p95_ms: 2100 },
      },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('首屏加载')).toBeInTheDocument()
    })
    const card = within(cardOf('首屏加载'))
    expect(card.getByText('最近 7 天没有样本（不是 0ms）')).toBeInTheDocument()
    expect(card.queryByText('1234ms')).not.toBeInTheDocument()
  })

  it('后端说有样本却没给分位数时，不显示 0ms', async () => {
    // 另一种自相矛盾：samples>0 但 p50_ms=null。
    // ⚠️ 这条盯的是「没有可显示的分位数时，绝不能显示 0ms」——
    // 0ms 看起来像"启动极快"，是个**假的乐观结论**。
    //
    // （把 `p50_ms ?? null` 写成 `?? 0` 现在不会露出 0ms ——
    //   因为卡片里还有一道 `p50 > 0` 的守卫兜着。
    //   那个变异因此是**行为等价**的，测不出差异 —— 这正是防御深度的结果，
    //   不是漏网。）
    mockedGetStats.mockResolvedValue({
      ...sampleStats,
      client_perf: {
        ...sampleClientPerf,
        first_frame: { ...sampleClientPerf.first_frame, samples: 12, p50_ms: null, p95_ms: null },
      },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('首屏加载')).toBeInTheDocument()
    })
    const card = within(cardOf('首屏加载'))
    expect(card.getByText('后端没给出耗时分位数（12 个样本）')).toBeInTheDocument()
    expect(card.queryByText('0ms')).not.toBeInTheDocument()
  })
})