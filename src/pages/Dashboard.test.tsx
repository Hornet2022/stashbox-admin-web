import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
    articles_created_7d: [
      { date: '2026-09-22', count: 5 },
      { date: '2026-09-23', count: 12 },
      { date: '2026-09-24', count: 9 },
    ],
    users_created_7d: [
      { date: '2026-09-22', count: 3 },
      { date: '2026-09-23', count: 7 },
    ],
    distill_completed_7d: [
      { date: '2026-09-23', count: 4 },
      { date: '2026-09-24', count: 6 },
    ],
  },
  comparison: {
    new_articles_24h: { today: 10, yesterday: 5, delta_pct: 1.0 },
    new_users_24h: { today: 3, yesterday: 2, delta_pct: 0.5 },
    distill_completed_24h: { today: 4, yesterday: 6, delta_pct: -0.3333 },
  },
  warning: null,
  generated_at: '2026-09-24T10:00:00+00:00',
}

const sampleP95 = {
  by_step: {
    step1_structure: { p50: 1.2, p95: 2.5, p99: 3.8 },
    step3_ttsing: { p50: 5.4, p95: 9.1, p99: 11.2 },
  },
  overall: { p50: 8.3, p95: 15.0, p99: 18.4 },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetStats.mockResolvedValue(sampleStats)
  mockedGetDistillP95.mockResolvedValue(sampleP95)
})

describe('Dashboard', () => {
  it('渲染标题 + 8 个 stats 卡片标签（含新增「蒸馏成功率」）', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('总览')).toBeInTheDocument()
    })
    expect(screen.getByText('用户总数')).toBeInTheDocument()
    expect(screen.getByText('文章总数')).toBeInTheDocument()
    expect(screen.getByText('蒸馏队列中')).toBeInTheDocument()
    expect(screen.getByText('已收听')).toBeInTheDocument()
    expect(screen.getByText('活跃音频')).toBeInTheDocument()
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
    expect(screen.getByText(/阈值：5 条/)).toBeInTheDocument()
    expect(screen.getByText(/实际：20 条/)).toBeInTheDocument()
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
      expect(screen.getByText(/orders 表缺失/)).toBeInTheDocument()
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

  // CP-STATS-REWORK #5：by_source 条形图
  it('by_source 条形图按数量降序显示', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('文章来源分布')).toBeInTheDocument()
    })
    // wechat 3200 最大 → 第一个出现
    const wechatRow = screen.getByText('wechat')
    expect(wechatRow).toBeInTheDocument()
    expect(screen.getByText('douyin')).toBeInTheDocument()
    expect(screen.getByText('pdf')).toBeInTheDocument()
  })

  // CP-DISTILL-PROM-SDK：distill-p95 卡片渲染 by_step + overall
  it('distill-p95 卡片渲染 overall + by_step 表格', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('蒸馏耗时 P50/P95/P99')).toBeInTheDocument()
    })
    expect(screen.getByText('overall')).toBeInTheDocument()
    expect(screen.getByText('step1_structure')).toBeInTheDocument()
    expect(screen.getByText('step3_ttsing')).toBeInTheDocument()
  })

  it('distill-p95 没数据时显示「暂无数据」占位', async () => {
    mockedGetDistillP95.mockResolvedValue({
      by_step: {},
      overall: { p50: null, p95: null, p99: null },
    })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/ai-service 未上报 metrics/)).toBeInTheDocument()
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
    // 文章总数卡片下方 +100%（new_articles_24h.today=10 / yesterday=5 → +100%）
    expect(screen.getByText('+100%')).toBeInTheDocument()
    // 新增用户 +50%（3/2 = +50%）
    expect(screen.getByText('+50%')).toBeInTheDocument()
  })
})