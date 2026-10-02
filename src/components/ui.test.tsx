import { DEFAULT_BADGE_LABELS, USER_STATUS_LABELS } from '../constants/labels'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MetricCard,
  Stepper,
  ReasonDialog,
  SlidingTabs,
  CaveatBanner,
  Badge,
} from './ui'

/**
 * ui.tsx 新增 5 组件（CP-NEW.1）的行为契约测试 —— CP-NEW.11。
 *
 * MetricCard：tone 染色 + loading skeleton + null value → "—"
 * Stepper：done / current / pending 三态 + done 序号显示 ✓
 * ReasonDialog：≥ minLength 才允许 confirm + 字符计数提示
 * SlidingTabs：onChange 回调 + aria-selected
 * CaveatBanner：warning / danger variant + 空 items → null
 * Badge：status tone 映射
 */

describe('MetricCard', () => {
  it('metrics 渲染每个 label 与 value', () => {
    render(
      <MetricCard
        label="覆盖率"
        metrics={[{ key: 'a', label: '已完成', value: 80, unit: '%' }]}
      />,
    )
    expect(screen.getByText('覆盖率')).toBeInTheDocument()
    expect(screen.getByText('已完成')).toBeInTheDocument()
    expect(screen.getByText('80.00%')).toBeInTheDocument()
  })

  it('null value 渲染 "—"', () => {
    render(
      <MetricCard
        label="x"
        metrics={[{ key: 'a', label: '缺数据', value: null, unit: '%' }]}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('loading=true 时渲染 skeleton（不渲染 metrics）', () => {
    const { container } = render(
      <MetricCard
        label="x"
        loading
        metrics={[{ key: 'a', label: 'metric', value: 50 }]}
      />,
    )
    // skeleton 用 animate-pulse div 渲染
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('label 缺省时不渲染 label 行', () => {
    const { container } = render(
      <MetricCard metrics={[{ key: 'a', label: 'm', value: 1 }]} />,
    )
    // label 行 <div className="text-sm text-neutral-500">{label}</div> 不存在
    const allDivs = container.querySelectorAll('div')
    const labelRow = Array.from(allDivs).find(
      (d) => d.className.includes('text-sm') && d.className.includes('text-neutral-500'),
    )
    expect(labelRow).toBeUndefined()
  })
})

describe('Stepper', () => {
  const steps = [
    { key: 'a', label: '步骤一' },
    { key: 'b', label: '步骤二' },
    { key: 'c', label: '步骤三' },
  ]

  it('所有步骤的 label 都渲染', () => {
    render(<Stepper steps={steps} activeIndex={0} />)
    expect(screen.getByText('步骤一')).toBeInTheDocument()
    expect(screen.getByText('步骤二')).toBeInTheDocument()
    expect(screen.getByText('步骤三')).toBeInTheDocument()
  })

  it('当前步骤标 aria-current="step"', () => {
    render(<Stepper steps={steps} activeIndex={1} />)
    const current = screen.getByText('步骤二').closest('li')
    expect(current?.getAttribute('aria-current')).toBe('step')
  })

  it('已完成步骤显示 ✓，当前/未做步骤显示序号', () => {
    // activeIndex=2 → step[0] step[1] 都是 done，显示 ✓
    // step[2] 是 current，显示 idx+1 = 3
    render(<Stepper steps={steps} activeIndex={2} />)
    const checks = screen.getAllByText('✓')
    expect(checks).toHaveLength(2)
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})

describe('ReasonDialog', () => {
  it('open=false → 不渲染', () => {
    const { container } = render(
      <ReasonDialog open={false} title="t" onClose={() => {}} onConfirm={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('open=true → 显示标题和描述', () => {
    render(
      <ReasonDialog
        open
        title="触发清理"
        description="删除原因写入审计"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByText('触发清理')).toBeInTheDocument()
    expect(screen.getByText('删除原因写入审计')).toBeInTheDocument()
  })

  it('reason 短于 minLength → confirm 按钮禁用 + 字符不足提示', async () => {
    const user = userEvent.setup()
    render(
      <ReasonDialog
        open
        title="t"
        minLength={5}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const textarea = screen.getByPlaceholderText(/请输入操作原因/)
    await user.type(textarea, 'abc')
    const confirmBtn = screen.getByText('确认') as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)
    expect(screen.getByText(/还需 2 字符/)).toBeInTheDocument()
  })

  it('reason 达到 minLength → confirm 按钮启用', async () => {
    const user = userEvent.setup()
    render(
      <ReasonDialog
        open
        title="t"
        minLength={5}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const textarea = screen.getByPlaceholderText(/请输入操作原因/)
    await user.type(textarea, 'abcde')
    const confirmBtn = screen.getByText('确认') as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(false)
    expect(screen.getByText('✓ 长度合规')).toBeInTheDocument()
  })

  it('open 关闭后重新打开 → reason 已清空', async () => {
    const { rerender } = render(
      <ReasonDialog open title="t" onClose={() => {}} onConfirm={() => {}} />,
    )
    const textarea = screen.getByPlaceholderText(/请输入操作原因/) as HTMLTextAreaElement
    await userEvent.type(textarea, '临时内容')
    rerender(
      <ReasonDialog open={false} title="t" onClose={() => {}} onConfirm={() => {}} />,
    )
    rerender(
      <ReasonDialog open title="t" onClose={() => {}} onConfirm={() => {}} />,
    )
    expect((screen.getByPlaceholderText(/请输入操作原因/) as HTMLTextAreaElement).value).toBe('')
  })
})

describe('SlidingTabs', () => {
  type Tab = 'a' | 'b' | 'c'
  const items: { key: Tab; label: string }[] = [
    { key: 'a', label: 'A' },
    { key: 'b', label: 'B' },
    { key: 'c', label: 'C' },
  ]

  it('渲染所有 tab + 当前 aria-selected=true', () => {
    render(
      <SlidingTabs<Tab> items={items} active="b" onChange={() => {}} />,
    )
    const a = screen.getByRole('tab', { name: 'A' })
    const b = screen.getByRole('tab', { name: 'B' })
    const c = screen.getByRole('tab', { name: 'C' })
    expect(a.getAttribute('aria-selected')).toBe('false')
    expect(b.getAttribute('aria-selected')).toBe('true')
    expect(c.getAttribute('aria-selected')).toBe('false')
  })

  it('点击 tab → onChange 回调传 key', async () => {
    const user = userEvent.setup()
    let captured: Tab | null = null
    render(
      <SlidingTabs<Tab>
        items={items}
        active="a"
        onChange={(k) => {
          captured = k
        }}
      />,
    )
    await user.click(screen.getByRole('tab', { name: 'C' }))
    expect(captured).toBe('c')
  })
})

describe('CaveatBanner', () => {
  it('空 items → 不渲染', () => {
    const { container } = render(<CaveatBanner items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('warning variant → role=status', () => {
    render(<CaveatBanner variant="warning" items={['warning text']} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('danger variant → role=alert', () => {
    render(<CaveatBanner variant="danger" items={['danger text']} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('title + items 都渲染', () => {
    render(<CaveatBanner items={['a', 'b']} title="约束" />)
    expect(screen.getByText('约束')).toBeInTheDocument()
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('null → "—"', () => {
    render(<Badge value={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('undefined → "—"', () => {
    render(<Badge value={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  // active/failed/pending 在用户、文章、推送、听感池四个域里含义不同，
  // 所以不进默认表：传 map 才翻译，不传就原样显示 —— 显示层不猜。
  it('无 map → 原样显示内部值，并按语义判色调', () => {
    render(<Badge value="active" />)
    expect(screen.getByText('active').className).toMatch(/text-success/)
  })

  it('传 map → 翻译成中文，色调跟随映射表的 tone', () => {
    render(<Badge value="active" map={USER_STATUS_LABELS} />)
    const el = screen.getByText('正常')
    expect(el.className).toMatch(/text-success/)
  })

  it('有歧义的词不会被别的域的映射表冲掉', () => {
    // 回归：曾经把各域映射平铺合并成默认表，PUSH_STATUS_LABELS 后展开，
    // 把 failed 悄悄覆盖成「发送失败」。这里断言默认表里没有歧义词。
    for (const k of ['active', 'failed', 'pending', 'done', 'sent']) {
      expect(DEFAULT_BADGE_LABELS[k]).toBeUndefined()
    }
    // 无歧义的词才在默认表里
    expect(DEFAULT_BADGE_LABELS.enabled?.label).toBe('已开启')
  })

  it('enabled（已开启）是绿色，不是灰色', () => {
    render(<Badge value="enabled" />)
    expect(screen.getByText('已开启').className).toMatch(/text-success/)
  })

  it('disabled（已关闭）是灰色', () => {
    render(<Badge value="disabled" />)
    expect(screen.getByText('已关闭').className).toMatch(/text-neutral-500/)
  })

  it('未知值 → muted（中性灰）', () => {
    render(<Badge value="weird-state" />)
    const el = screen.getByText('weird-state')
    expect(el.className).toMatch(/text-neutral-500|text-neutral-400/)
  })
})