import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuotaAdjustModal } from './QuotaAdjustModal'
import type { UserRow } from '../../types'

/**
 * QuotaAdjustModal 单测 —— CP-NEW.13。
 */

const target: UserRow = {
  id: 7,
  email: 'bob@example.com',
  display_name: 'Bob',
  role: 'user',
  tier: 'free',
  status: 'active',
  monthly_quota: 100,
  used_quota: 50,
  created_at: '2024-01-01T00:00:00Z',
}

describe('QuotaAdjustModal', () => {
  it('target=null → 不渲染', () => {
    const { container } = render(
      <QuotaAdjustModal
        target={null}
        quota=""
        reason=""
        submitting={false}
        error={null}
        onClose={() => {}}
        onQuotaChange={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('target 有值 → 显示标题含 email', () => {
    render(
      <QuotaAdjustModal
        target={target}
        quota="200"
        reason=""
        submitting={false}
        error={null}
        onClose={() => {}}
        onQuotaChange={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText(/bob@example.com/)).toBeInTheDocument()
  })

  it('quota 受控 + onQuotaChange 回调', async () => {
    const user = userEvent.setup()
    const onQuotaChange = vi.fn()
    render(
      <QuotaAdjustModal
        target={target}
        quota="100"
        reason=""
        submitting={false}
        error={null}
        onClose={() => {}}
        onQuotaChange={onQuotaChange}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    const quotaInput = screen.getByLabelText(/月配额/) as HTMLInputElement
    await user.clear(quotaInput)
    await user.type(quotaInput, '500')
    expect(onQuotaChange).toHaveBeenCalled()
  })

  it('error 非空 → 渲染错误文案', () => {
    render(
      <QuotaAdjustModal
        target={target}
        quota="100"
        reason=""
        submitting={false}
        error="配额必须是非负整数"
        onClose={() => {}}
        onQuotaChange={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText('配额必须是非负整数')).toBeInTheDocument()
  })

  it('submitting=true → 按钮文字 "提交中…" 且 disabled', () => {
    render(
      <QuotaAdjustModal
        target={target}
        quota="100"
        reason=""
        submitting={true}
        error={null}
        onClose={() => {}}
        onQuotaChange={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText('提交中…')).toBeInTheDocument()
    const btn = screen.getByText('提交中…') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('点击取消 → onClose 回调', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <QuotaAdjustModal
        target={target}
        quota="100"
        reason=""
        submitting={false}
        error={null}
        onClose={onClose}
        onQuotaChange={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    await user.click(screen.getByText('取消'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})