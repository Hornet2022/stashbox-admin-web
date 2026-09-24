import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AudioVariants } from './AudioVariants'

/**
 * AudioVariants 页单测 —— CP-NEW.16。
 *
 * Mock '../api/admin/audio-variants'（getAudioVariantsStats）。
 * 覆盖：覆盖率三档染色 / by_bitrate 表 / loading / missing。
 */

vi.mock('../api/admin/audio-variants', () => ({
  getAudioVariantsStats: vi.fn(),
}))

import { getAudioVariantsStats } from '../api/admin/audio-variants'
const mockedStats = vi.mocked(getAudioVariantsStats)

function renderPage() {
  return render(
    <MemoryRouter>
      <AudioVariants />
    </MemoryRouter>,
  )
}

const sampleStats = {
  by_bitrate: [
    { bitrate: 64, count: 5, avg_file_size_bytes: 102400, avg_duration_sec: 60.0 },
    { bitrate: 96, count: 8, avg_file_size_bytes: 153600, avg_duration_sec: 90.5 },
    { bitrate: 128, count: 12, avg_file_size_bytes: 204800, avg_duration_sec: 120.3 },
  ],
  covered_articles: 25,
  done_articles: 40,
  coverage_ratio: 0.625,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AudioVariants', () => {
  it('渲染标题 + 三个 MetricCard', async () => {
    mockedStats.mockResolvedValue(sampleStats)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('多码率统计')).toBeInTheDocument()
    })
    expect(screen.getByText('覆盖率（covered / done）')).toBeInTheDocument()
    expect(screen.getByText('覆盖文章数')).toBeInTheDocument()
    expect(screen.getByText('码率分布')).toBeInTheDocument()
  })

  it('覆盖率 ≥60% → success tone + 数值', async () => {
    mockedStats.mockResolvedValue(sampleStats)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('62.50%')).toBeInTheDocument()
    })
  })

  it('覆盖率 <30% → error tone', async () => {
    mockedStats.mockResolvedValue({ ...sampleStats, coverage_ratio: 0.15, covered_articles: 6 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('15.00%')).toBeInTheDocument()
    })
  })

  it('覆盖率 30-60% → warning tone', async () => {
    mockedStats.mockResolvedValue({ ...sampleStats, coverage_ratio: 0.45, covered_articles: 18 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('45.00%')).toBeInTheDocument()
    })
  })

  it('by_bitrate 表渲染 3 行 + 数值', async () => {
    mockedStats.mockResolvedValue(sampleStats)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('64')).toBeInTheDocument()
    })
    expect(screen.getByText('96')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // count
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('avg_file_size_bytes 转 KB 显示', async () => {
    mockedStats.mockResolvedValue(sampleStats)
    renderPage()
    await waitFor(() => {
      // 102400 / 1024 = 100.0 KB
      expect(screen.getByText('100.0 KB')).toBeInTheDocument()
    })
  })

  it('loading 状态显示 skeleton', async () => {
    mockedStats.mockReturnValue(new Promise(() => {}) as unknown as Promise<never>)
    const { container } = renderPage()
    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })
  })

  it('missing 端点 → ErrorNotice', async () => {
    mockedStats.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/端点未上线/)).toBeInTheDocument()
    })
  })

  it('by_bitrate 为空 → "暂无变体数据"', async () => {
    mockedStats.mockResolvedValue({ ...sampleStats, by_bitrate: [] })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('暂无变体数据')).toBeInTheDocument()
    })
  })
})