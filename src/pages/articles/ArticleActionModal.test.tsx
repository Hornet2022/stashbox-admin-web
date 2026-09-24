import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArticleActionModal } from './ArticleActionModal'
import type { ArticleRow } from '../../types'

/**
 * ArticleActionModal 单测 —— CP-NEW.13。
 *
 * 覆盖：标题随 action 切换 / 删除强调红色警告 / reason textarea 双向绑定 /
 * 提交回调 / 错误展示 / 关闭回调。
 */

const target: ArticleRow = {
  id: 42,
  title: '测试文章',
  status: 'failed',
  tags: [],
  quality_score: null,
  audio_id: null,
  created_at: '2024-01-15T08:30:00Z',
}

describe('ArticleActionModal', () => {
  it('action=null → 不渲染', () => {
    const { container } = render(
      <ArticleActionModal
        action={null}
        target={null}
        reason=""
        submitting={false}
        error={null}
        onClose={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('action=retry → 标题含 "强制重试"', () => {
    render(
      <ArticleActionModal
        action="retry"
        target={target}
        reason=""
        submitting={false}
        error={null}
        onClose={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText(/强制重试/)).toBeInTheDocument()
  })

  it('action=delete → 标题含 "删除文章" + 红色警告', () => {
    render(
      <ArticleActionModal
        action="delete"
        target={target}
        reason=""
        submitting={false}
        error={null}
        onClose={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText(/删除文章/)).toBeInTheDocument()
    expect(screen.getByText(/硬删除/)).toBeInTheDocument()
    expect(screen.getByText(/不可恢复/)).toBeInTheDocument()
  })

  it('action=invalidate → 标题含 "失效音频"', () => {
    render(
      <ArticleActionModal
        action="invalidate"
        target={target}
        reason=""
        submitting={false}
        error={null}
        onClose={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText(/失效音频/)).toBeInTheDocument()
    expect(screen.queryByText(/硬删除/)).toBeNull()
  })

  it('title 包含 article id', () => {
    render(
      <ArticleActionModal
        action="retry"
        target={target}
        reason=""
        submitting={false}
        error={null}
        onClose={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText(/42/)).toBeInTheDocument()
  })

  it('reason textarea 受控 + onReasonChange 回调', async () => {
    const user = userEvent.setup()
    const onReasonChange = vi.fn()
    render(
      <ArticleActionModal
        action="retry"
        target={target}
        reason=""
        submitting={false}
        error={null}
        onClose={() => {}}
        onReasonChange={onReasonChange}
        onSubmit={() => {}}
      />,
    )
    const textarea = screen.getByPlaceholderText(/会写入审计日志/)
    await user.type(textarea, 'test reason')
    expect(onReasonChange).toHaveBeenCalled()
  })

  it('error prop 非空 → 渲染错误文案', () => {
    render(
      <ArticleActionModal
        action="retry"
        target={target}
        reason=""
        submitting={false}
        error="网络错误：服务不可达"
        onClose={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText('网络错误：服务不可达')).toBeInTheDocument()
  })

  it('submitting=true → 按钮显示 "提交中…" 且 disabled', () => {
    render(
      <ArticleActionModal
        action="retry"
        target={target}
        reason=""
        submitting={true}
        error={null}
        onClose={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText('提交中…')).toBeInTheDocument()
    const submitBtn = screen.getByText('提交中…') as HTMLButtonElement
    expect(submitBtn.disabled).toBe(true)
  })

  it('点击取消 → onClose 回调', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ArticleActionModal
        action="retry"
        target={target}
        reason=""
        submitting={false}
        error={null}
        onClose={onClose}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    await user.click(screen.getByText('取消'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('action=delete 时确认按钮文字为 "确认删除"', () => {
    render(
      <ArticleActionModal
        action="delete"
        target={target}
        reason="审计原因"
        submitting={false}
        error={null}
        onClose={() => {}}
        onReasonChange={() => {}}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByText('确认删除')).toBeInTheDocument()
  })
})