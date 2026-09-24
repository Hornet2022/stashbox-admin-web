import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'

/**
 * Dashboard 页单测 —— CP-NEW.14。
 *
 * Mock '../api/admin' 的 getStats，覆盖：
 * - stats 卡片 5 项渲染
 * - 错误状态
 * - missing 提示
 * - reload 按钮
 */

vi.mock('../api/admin', () => ({
  getStats: vi.fn(),
}))

import * as adminModule from '../api/admin'
const mockedGetStats = vi.mocked(adminModule.getStats)

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

// 与 content-service/admin_router.py 真实返回形态一致（2026-09-24 契约修正）
const sampleStats = {
  total_users: 1234,
  total_articles: 5678,
  pending: 12,
  listened: 890,
  revenue: 0,
  active_audio_files: 3800,
  failed_distillations_24h: 12,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Dashboard', () => {
  it('渲染标题 + 7 个 stats 卡片标签', async () => {
    mockedGetStats.mockResolvedValue(sampleStats)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('总览')).toBeInTheDocument()
    })
    expect(screen.getByText('用户总数')).toBeInTheDocument()
    expect(screen.getByText('文章总数')).toBeInTheDocument()
    expect(screen.getByText('蒸馏队列中')).toBeInTheDocument()
    expect(screen.getByText('已收听')).toBeInTheDocument()
    expect(screen.getByText('活跃音频')).toBeInTheDocument()
    expect(screen.getByText('24h 失败蒸馏')).toBeInTheDocument()
    expect(screen.getByText('本月营收')).toBeInTheDocument()
  })

  it('stats 数值带千分位', async () => {
    mockedGetStats.mockResolvedValue(sampleStats)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument()
    })
    expect(screen.getByText('5,678')).toBeInTheDocument()
    expect(screen.getByText('890')).toBeInTheDocument()
    expect(screen.getByText('3,800')).toBeInTheDocument()
  })

  // 回归用例（2026-09-24）：后端真实响应缺字段时显示 "—" 而不是崩溃
  // 旧 bug：total_distilled 后端从未返回，data[field].toLocaleString() 直接 TypeError
  it('后端响应缺字段 → 该卡显示 "—" 不崩溃', async () => {
    mockedGetStats.mockResolvedValue({
      total_users: 5,
      total_articles: 6,
      // pending / listened / revenue / active_audio_files / failed_distillations_24h 全缺
    } as never)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5)
  })

  it('loading 状态显示 skeleton', async () => {
    // 让 promise 永不 resolve 模拟 loading
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

  it('底部 "近 7 天用户增长" 占位卡渲染', async () => {
    mockedGetStats.mockResolvedValue(sampleStats)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('近 7 天用户增长')).toBeInTheDocument()
    })
    expect(screen.getByText(/用户增长趋势端点待上线/)).toBeInTheDocument()
  })
})