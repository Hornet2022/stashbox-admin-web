import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DistillMetrics } from './DistillMetrics'

/**
 * DistillMetrics 页单测 —— 2026-10 新增（bug #9）。
 *
 * 这一页此前**没有任何测试**，而它恰好是监控页：出问题的时候没人会发现。
 *
 * 核心回归点：后端抓不到 Prometheus / ai-service metrics 时，返回的是
 * **HTTP 200 + {error: "..."}**，不是异常。于是 useApi 的 `error` 是 null，
 * 页面照常渲染「尚无采样」—— 和「真的还没跑过蒸馏」完全无法区分。
 * 监控后端宕机时这一页静默说谎，恰恰发生在最需要它报警的时候。
 *
 * 这里锁住：后端 200 带 error 时必须显式提示，不能退化成空图。
 */

vi.mock('../api/admin', () => ({
  getDistillP95: vi.fn(),
}))

import * as adminModule from '../api/admin'
const mockedGetDistillP95 = vi.mocked(adminModule.getDistillP95)

function renderPage() {
  return render(
    <MemoryRouter>
      <DistillMetrics />
    </MemoryRouter>,
  )
}

const emptyStep = {
  count: 0,
  p50: null,
  p95: null,
  p99: null,
  mean: null,
  upper_bound: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DistillMetrics · 后端失败路径', () => {
  it('后端返回 200 + error 字段时必须提示，而不是显示成「尚无采样」', async () => {
    // 与 content-service/admin_router.py 的 except 分支返回形态一致：
    // HTTP 200，by_step 空，error 带原因。
    mockedGetDistillP95.mockResolvedValue({
      cached: false,
      by_step: {},
      overall: emptyStep,
      error: 'prometheus unreachable: Connection refused',
    } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/耗时数据暂不可用/)).toBeInTheDocument()
    })
    // 原因要透出来，不能只说一句「不可用」
    expect(screen.getByText(/prometheus unreachable/)).toBeInTheDocument()
  })

  it('后端返回 200 + error 且 by_step 为空时不崩溃（不得解引用 undefined）', async () => {
    // 曾经的写法是 `resp.by_step[key]` 直接解引用 —— by_step 整个缺失时
    // TypeError 把整页带崩，连错误提示都来不及渲染。
    mockedGetDistillP95.mockResolvedValue({
      cached: false,
      overall: emptyStep,
      error: 'boom',
    } as never)

    expect(() => renderPage()).not.toThrow()
    await waitFor(() => {
      expect(screen.getByText(/耗时数据暂不可用/)).toBeInTheDocument()
    })
  })
})

describe('DistillMetrics · 正常路径', () => {
  it('有真实样本且无 error 时不显示错误提示', async () => {
    mockedGetDistillP95.mockResolvedValue({
      cached: true,
      by_step: { structure: { ...emptyStep, count: 3, p50: 120, p95: 300, p99: 420 } },
      overall: { ...emptyStep, count: 3, p50: 900, p95: 1200, p99: 1500 },
    } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/基于 3 次蒸馏/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/耗时数据暂不可用/)).not.toBeInTheDocument()
  })

  it('by_step 为空但没有 error → 才是真正的「尚无采样」', async () => {
    mockedGetDistillP95.mockResolvedValue({
      cached: false,
      by_step: {},
      overall: emptyStep,
    } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('尚无采样')).toBeInTheDocument()
    })
    expect(screen.queryByText(/耗时数据暂不可用/)).not.toBeInTheDocument()
  })
})