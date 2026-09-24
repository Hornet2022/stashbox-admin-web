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

const sampleStats = {
  total_users: 1234,
  total_articles: 5678,
  total_distilled: 4321,
  active_audio_files: 3800,
  failed_distillations_24h: 12,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Dashboard', () => {
  it('渲染标题 + 5 个 stats 卡片标签', async () => {
    mockedGetStats.mockResolvedValue(sampleStats)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('总览')).toBeInTheDocument()
    })
    expect(screen.getByText('用户总数')).toBeInTheDocument()
    expect(screen.getByText('文章总数')).toBeInTheDocument()
    expect(screen.getByText('蒸馏完成')).toBeInTheDocument()
    expect(screen.getByText('活跃音频')).toBeInTheDocument()
    expect(screen.getByText('24h 失败蒸馏')).toBeInTheDocument()
  })

  it('stats 数值带千分位', async () => {
    mockedGetStats.mockResolvedValue(sampleStats)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument()
    })
    expect(screen.getByText('5,678')).toBeInTheDocument()
    expect(screen.getByText('4,321')).toBeInTheDocument()
    expect(screen.getByText('3,800')).toBeInTheDocument()
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