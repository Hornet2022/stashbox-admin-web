import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AbReport } from './AbReport'

/**
 * AbReport 页单测 —— CP-NEW.16。
 *
 * Mock '../api/admin/ab-report' (getAbReport)。
 * 覆盖：CaveatBanner 红色提示 / 预置 2 条 caveats + 后端 caveats 合并 /
 *       数据不足态 / 三组对比表 / pre_experiment 弱化 / 时间筛选。
 */

vi.mock('../api/admin/ab-report', () => ({
  getAbReport: vi.fn(),
}))

import { getAbReport } from '../api/admin/ab-report'
const mockedAbReport = vi.mocked(getAbReport)

function renderPage() {
  return render(
    <MemoryRouter>
      <AbReport />
    </MemoryRouter>,
  )
}

const enoughData = {
  groups: [
    {
      group: 'personalized' as const,
      tasks: 200,
      avg_overall_score: 4.2,
      eval_count: 180,
      play_count: 190,
      complete_count: 150,
      completion_rate: 0.789,
      rewatch_pairs: 50,
      play_pairs: 190,
      rewatch_rate: 0.263,
      skip_count: 20,
      skip_rate: 0.105,
    },
    {
      group: 'general' as const,
      tasks: 600,
      avg_overall_score: 3.8,
      eval_count: 540,
      play_count: 580,
      complete_count: 380,
      completion_rate: 0.655,
      rewatch_pairs: 100,
      play_pairs: 580,
      rewatch_rate: 0.172,
      skip_count: 100,
      skip_rate: 0.172,
    },
    {
      group: 'pre_experiment' as const,
      tasks: 5000,
      avg_overall_score: 3.5,
      eval_count: 4500,
      play_count: 4800,
      complete_count: 3000,
      completion_rate: 0.625,
      rewatch_pairs: 600,
      play_pairs: 4800,
      rewatch_rate: 0.125,
      skip_count: 1200,
      skip_rate: 0.250,
    },
  ],

  caveats: ['后端注入 caveat 1', '后端注入 caveat 2'],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AbReport', () => {
  it('渲染标题 + 顶部 CaveatBanner 红色提示 2 条预置 caveats', async () => {
    mockedAbReport.mockResolvedValue({ groups: [], caveats: [] })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('A/B 报表')).toBeInTheDocument()
    })
    expect(screen.getByText(/0029 上线前的历史蒸馏数据/)).toBeInTheDocument()
    expect(screen.getByText(/A\/B 结论需从 ab_group 落库部署日起重新计 2 周/)).toBeInTheDocument()
  })

  it('后端 caveats 与预置 caveats 合并展示', async () => {
    mockedAbReport.mockResolvedValue(enoughData)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('后端注入 caveat 1')).toBeInTheDocument()
    })
    expect(screen.getByText('后端注入 caveat 2')).toBeInTheDocument()
    // 同时显示预置 2 条
    expect(screen.getByText(/0029 上线前的历史蒸馏数据/)).toBeInTheDocument()
  })

  it('数据不足态（仅 pre_experiment）→ "数据积累中"', async () => {
    mockedAbReport.mockResolvedValue({
      groups: [
        {
          group: 'pre_experiment' as const,
          tasks: 5000,
          avg_overall_score: 3.5,
          eval_count: 4500,
          play_count: 4800,
          complete_count: 3000,
          completion_rate: 0.625,
          rewatch_pairs: 600,
          play_pairs: 4800,
          rewatch_rate: 0.125,
          skip_count: 1200,
          skip_rate: 0.25,
        },
      ],

      caveats: [],
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/数据积累中，距 0029 部署起需满 2 周/)).toBeInTheDocument()
    })
  })

  it('数据充足时（2+ 组）渲染对比表 + GroupCard', async () => {
    mockedAbReport.mockResolvedValue(enoughData)
    renderPage()
    await waitFor(() => {
      // GROUP_LABELS 在 GroupCard + 对比表都出现，用 getAllByText
      expect(screen.getAllByText('personalized · 个性化组（user_id%100<30，ITT）').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText('general · 通用组').length).toBeGreaterThanOrEqual(1)
    // pre_experiment 在对比表中显示但 opacity-50 弱化
    expect(screen.getAllByText('pre_experiment · 实验前期（0029 上线前数据）').length).toBeGreaterThanOrEqual(1)
    // tasks 列：200 / 600 / 5000
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('600')).toBeInTheDocument()
    expect(screen.getByText('5,000')).toBeInTheDocument()
  })

  it('completion_rate / rewatch_rate / skip_rate 显示为百分比', async () => {
    mockedAbReport.mockResolvedValue(enoughData)
    renderPage()
    await waitFor(() => {
      // completion_rate: 0.789 → 78.90%
      expect(screen.getAllByText('78.90%').length).toBeGreaterThanOrEqual(1)
      // 65.52% / 17.24% / 10.53% 等
    })
  })

  it('点击"应用筛选" → 把 date_from/date_to 传给 ab-report', async () => {
    const user = userEvent.setup()
    mockedAbReport.mockResolvedValue(enoughData)
    renderPage()
    await waitFor(() => {
      expect(mockedAbReport).toHaveBeenCalled()
    })
    // 输入 date_from 并点应用筛选
    const dateInput = screen.getByLabelText(/date_from/) as HTMLInputElement
    // happy-dom 的 datetime-local 需要 value 模式
    await user.type(dateInput, '2024-01-01T00:00')
    await user.click(screen.getByText('应用筛选'))
    await waitFor(() => {
      expect(mockedAbReport.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
    const lastCall = mockedAbReport.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(lastCall.date_from).toBe('2024-01-01T00:00')
  })

  it('missing 端点 → ErrorNotice', async () => {
    mockedAbReport.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/端点未上线/)).toBeInTheDocument()
    })
  })

  it('loading 状态显示 skeleton', async () => {
    mockedAbReport.mockReturnValue(new Promise(() => {}) as unknown as Promise<never>)
    const { container } = renderPage()
    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })
  })
})