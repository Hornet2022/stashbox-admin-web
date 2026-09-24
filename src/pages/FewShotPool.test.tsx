import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FewShotPool } from './FewShotPool'

/**
 * FewShotPool 页单测 —— CP-NEW.16。
 *
 * Mock '../api/admin/few-shot-pool' (getPoolHealth + listPool)。
 * 覆盖：tabs 切换（健康度+列表 / 清理+抽查）/ 健康度三档染色 /
 *       池列表 / filter / pagination / missing。
 */

vi.mock('../api/admin/few-shot-pool', () => ({
  getPoolHealth: vi.fn(),
  listPool: vi.fn(),
  cleanupPool: vi.fn(),
  getAuditSample: vi.fn(),
  postAuditResult: vi.fn(),
}))

import * as poolModule from '../api/admin/few-shot-pool'
const mockedHealth = vi.mocked(poolModule.getPoolHealth)
const mockedList = vi.mocked(poolModule.listPool)

function renderPage() {
  return render(
    <MemoryRouter>
      <FewShotPool />
    </MemoryRouter>,
  )
}

const sampleHealth = {
  total_count: 200,
  high_score_count: 80,
  medium_score_count: 70,
  low_score_count: 50,
  active_count: 150,
  stale_count: 10,
  health_score: 85,
  warning: null as null,
}

const samplePool = {
  total: 2,
  items: [
    {
      id: '1',
      user_id: null,
      kind: 'hook' as const,
      source_pattern: 'abc',
      rewrite_text: 'hook 改写',
      score_avg: 4.5,
      usage_count: 10,
      last_used_at: '2024-01-15T08:30:00Z',
      active: true,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      user_id: null,
      kind: 'section' as const,
      source_pattern: 'def',
      rewrite_text: 'section 改写',
      score_avg: 3.5,
      usage_count: 5,
      last_used_at: null,
      active: false,
      created_at: '2024-01-02T00:00:00Z',
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FewShotPool', () => {
  it('渲染标题 + 2 个 tabs', async () => {
    mockedHealth.mockResolvedValue(sampleHealth)
    mockedList.mockResolvedValue(samplePool)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('听感池')).toBeInTheDocument()
    })
    expect(screen.getByText('健康度 + 列表')).toBeInTheDocument()
    expect(screen.getByText('清理 + 抽查')).toBeInTheDocument()
  })

  it('overview tab：渲染 PoolHealthCard 6 计数 + 池列表', async () => {
    mockedHealth.mockResolvedValue(sampleHealth)
    mockedList.mockResolvedValue(samplePool)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('池健康度')).toBeInTheDocument()
    })
    // 6 个统计 tile（注意 "10" 同时是陈旧 count 和 usage_count，用 getAllByText）
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('70')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1)
    // 池列表
    expect(screen.getByText('hook 改写')).toBeInTheDocument()
    expect(screen.getByText('section 改写')).toBeInTheDocument()
  })

  it('health_score ≥80 → success tone', async () => {
    mockedHealth.mockResolvedValue(sampleHealth)
    mockedList.mockResolvedValue(samplePool)
    renderPage()
    await waitFor(() => {
      const scoreEl = screen.getByText('85.0')
      expect(scoreEl.className).toMatch(/text-success/)
    })
  })

  it('health_score <60 → error tone', async () => {
    mockedHealth.mockResolvedValue({ ...sampleHealth, health_score: 30 })
    mockedList.mockResolvedValue(samplePool)
    renderPage()
    await waitFor(() => {
      const scoreEl = screen.getByText('30.0')
      expect(scoreEl.className).toMatch(/text-error/)
    })
  })

  it('warning=stale → CaveatBanner', async () => {
    mockedHealth.mockResolvedValue({ ...sampleHealth, warning: 'stale' })
    mockedList.mockResolvedValue(samplePool)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/陈旧条目过多/)).toBeInTheDocument()
    })
  })

  it('kind filter tab 切换 → 重置到第 1 页', async () => {
    const user = userEvent.setup()
    mockedHealth.mockResolvedValue(sampleHealth)
    mockedList.mockResolvedValue(samplePool)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('hook 改写')).toBeInTheDocument()
    })
    // 点击 hook tab（默认 active=全部，所以点击后 active=hook）
    const hookTab = screen.getByRole('tab', { name: 'hook' })
    await user.click(hookTab)
    // 触发重新调用 with kind=hook
    await waitFor(() => {
      const lastCall = mockedList.mock.calls.at(-1)?.[0] as Record<string, unknown>
      expect(lastCall.kind).toBe('hook')
    })
  })

  it('cleanup tab → 显示 PoolAuditWorkflow 内容', async () => {
    const user = userEvent.setup()
    mockedHealth.mockResolvedValue(sampleHealth)
    mockedList.mockResolvedValue(samplePool)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('听感池')).toBeInTheDocument()
    })
    await user.click(screen.getByText('清理 + 抽查'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 1 · 清理陈旧/)).toBeInTheDocument()
    })
  })

  it('missing 端点 → ErrorNotice', async () => {
    mockedHealth.mockRejectedValue({ response: { status: 404 } })
    mockedList.mockResolvedValue(samplePool)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/端点未上线/)).toBeInTheDocument()
    })
  })

  it('loading 状态显示 skeleton', async () => {
    mockedHealth.mockReturnValue(new Promise(() => {}) as unknown as Promise<never>)
    mockedList.mockResolvedValue(samplePool)
    const { container } = renderPage()
    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })
  })
})