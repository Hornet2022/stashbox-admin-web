import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PoolHealthCard } from './PoolHealthCard'
import type { PoolHealthReport } from '../../types'

/**
 * PoolHealthCard 单测 —— CP-NEW.13。
 *
 * 覆盖：健康分三档染色 / warning 文案 / loading skeleton / 数据缺失兜底
 */

const baseHealth: PoolHealthReport = {
  total_count: 200,
  high_score_count: 80,
  medium_score_count: 70,
  low_score_count: 50,
  active_count: 150,
  stale_count: 10,
  health_score: 85,
  warning: null,
}

describe('PoolHealthCard', () => {
  it('data=null + loading=true → 渲染 skeleton', () => {
    const { container } = render(<PoolHealthCard data={null} loading={true} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText('池健康度')).toBeInTheDocument()
  })

  it('data=null + loading=false → 返回 null（不渲染）', () => {
    const { container } = render(<PoolHealthCard data={null} loading={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('data 有值：渲染 health_score 数值', () => {
    render(<PoolHealthCard data={baseHealth} loading={false} />)
    expect(screen.getByText('85.0')).toBeInTheDocument()
    expect(screen.getByText('良好')).toBeInTheDocument()
  })

  it('health_score ≥80 → success tone', () => {
    render(<PoolHealthCard data={{ ...baseHealth, health_score: 85 }} loading={false} />)
    const scoreEl = screen.getByText('85.0')
    expect(scoreEl.className).toMatch(/text-success/)
  })

  it('health_score 60-80 → warning tone', () => {
    render(<PoolHealthCard data={{ ...baseHealth, health_score: 70 }} loading={false} />)
    const scoreEl = screen.getByText('70.0')
    expect(scoreEl.className).toMatch(/text-warning/)
    expect(screen.getByText('一般')).toBeInTheDocument()
  })

  it('health_score <60 → error tone + "需关注" label', () => {
    render(<PoolHealthCard data={{ ...baseHealth, health_score: 30 }} loading={false} />)
    const scoreEl = screen.getByText('30.0')
    expect(scoreEl.className).toMatch(/text-error/)
    expect(screen.getByText('需关注')).toBeInTheDocument()
  })

  it('warning="insufficient" → CaveatBanner 显示提示', () => {
    render(
      <PoolHealthCard
        data={{ ...baseHealth, warning: 'insufficient' }}
        loading={false}
      />,
    )
    expect(screen.getByText(/池总量过低/)).toBeInTheDocument()
  })

  it('warning="stale" → CaveatBanner 显示陈旧提示', () => {
    render(
      <PoolHealthCard
        data={{ ...baseHealth, warning: 'stale' }}
        loading={false}
      />,
    )
    expect(screen.getByText(/陈旧条目过多/)).toBeInTheDocument()
  })

  it('warning=null → 不渲染 CaveatBanner', () => {
    render(<PoolHealthCard data={{ ...baseHealth, warning: null }} loading={false} />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('6 个统计 tile 都渲染', () => {
    render(<PoolHealthCard data={baseHealth} loading={false} />)
    expect(screen.getAllByText('200').length).toBeGreaterThan(0) // 总条目
    expect(screen.getByText('80')).toBeInTheDocument() // 高分
    expect(screen.getByText('70')).toBeInTheDocument() // 中分
    expect(screen.getByText('50')).toBeInTheDocument() // 低分
    expect(screen.getByText('150')).toBeInTheDocument() // 活跃
    expect(screen.getByText('10')).toBeInTheDocument() // 陈旧
  })

  it('占比 = 0 / 100% 边界：total=0 时不除零', () => {
    const empty: PoolHealthReport = { ...baseHealth, total_count: 0 }
    render(<PoolHealthCard data={empty} loading={false} />)
    // pct(80, 0) = '0'，pct(150, 0) = '0'（不报 NaN）
    expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(0)
  })
})