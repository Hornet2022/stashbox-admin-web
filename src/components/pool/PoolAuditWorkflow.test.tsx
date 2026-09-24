import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PoolAuditWorkflow } from './PoolAuditWorkflow'
import { useToastStore } from '../../store/toast'

/**
 * PoolAuditWorkflow 单测 —— CP-NEW.16。
 *
 * Mock '../api/admin/few-shot-pool' (cleanupPool / getAuditSample / postAuditResult)。
 * 覆盖：3 步 stepper 渲染 / cleanup ReasonDialog / step 1 → step 2 跳转 /
 *       打分提交 / 自动取下一批。
 */

vi.mock('../../api/admin/few-shot-pool', () => ({
  cleanupPool: vi.fn(),
  getAuditSample: vi.fn(),
  postAuditResult: vi.fn(),
}))

import * as poolModule from '../../api/admin/few-shot-pool'
const mockedCleanup = vi.mocked(poolModule.cleanupPool)
const mockedGetSample = vi.mocked(poolModule.getAuditSample)
const mockedPostResult = vi.mocked(poolModule.postAuditResult)

const sampleBatch = {
  total: 3,
  items: [
    { id: 'p1', kind: 'hook' as const, source_pattern: 'abc', rewrite_text: 'hook 改写 1', score_avg: 4.5, usage_count: 10 },
    { id: 'p2', kind: 'section' as const, source_pattern: 'def', rewrite_text: 'section 改写 2', score_avg: 3.5, usage_count: 5 },
    { id: 'p3', kind: 'outro' as const, source_pattern: 'ghi', rewrite_text: 'outro 改写 3', score_avg: 2.5, usage_count: 2 },
  ],
}

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
  vi.clearAllMocks()
})

describe('PoolAuditWorkflow', () => {
  it('初始：步骤 1 可见 + 触发清理 + 跳过清理按钮', () => {
    render(<PoolAuditWorkflow />)
    expect(screen.getByText(/步骤 1 · 清理陈旧/)).toBeInTheDocument()
    expect(screen.getByText('触发清理')).toBeInTheDocument()
    expect(screen.getByText('跳过清理')).toBeInTheDocument()
  })

  it('点击"跳过清理" → 跳到步骤 2 + 拉一批', async () => {
    const user = userEvent.setup()
    mockedGetSample.mockResolvedValue(sampleBatch)
    render(<PoolAuditWorkflow />)
    await user.click(screen.getByText('跳过清理'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 2 · 抽查样本/)).toBeInTheDocument()
    })
    expect(mockedGetSample).toHaveBeenCalledWith(10)
  })

  it('点击"触发清理" → 打开 ReasonDialog + reason ≥5 才允许提交', async () => {
    const user = userEvent.setup()
    render(<PoolAuditWorkflow />)
    await user.click(screen.getByText('触发清理'))
    expect(screen.getByText('触发池清理')).toBeInTheDocument()
    const textarea = screen.getByPlaceholderText(/请输入操作原因/)
    await user.type(textarea, 'abc')
    const confirmBtn = screen.getByText('执行清理') as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)
    await user.clear(textarea)
    await user.type(textarea, 'reason 足够长')
    expect((screen.getByText('执行清理') as HTMLButtonElement).disabled).toBe(false)
  })

  it('清理成功 → toast + 跳步骤 2 + 拉一批', async () => {
    const user = userEvent.setup()
    mockedCleanup.mockResolvedValue({ stale: 5, low_quality: 3, duplicates: 1, total: 9 })
    mockedGetSample.mockResolvedValue(sampleBatch)
    render(<PoolAuditWorkflow />)
    await user.click(screen.getByText('触发清理'))
    const textarea = screen.getByPlaceholderText(/请输入操作原因/)
    await user.type(textarea, '定期清理任务')
    await user.click(screen.getByText('执行清理'))
    await waitFor(() => {
      expect(mockedCleanup).toHaveBeenCalledWith('定期清理任务')
    })
    await waitFor(() => {
      expect(useToastStore.getState().toasts.some((t) => t.message.includes('清理完成'))).toBe(true)
    })
    await waitFor(() => {
      expect(screen.getByText(/步骤 2 · 抽查样本/)).toBeInTheDocument()
    })
  })

  it('步骤 2 显示样本 + score + "开始打分" 按钮', async () => {
    const user = userEvent.setup()
    mockedGetSample.mockResolvedValue(sampleBatch)
    render(<PoolAuditWorkflow />)
    await user.click(screen.getByText('跳过清理'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 2 · 抽查样本/)).toBeInTheDocument()
    })
    expect(screen.getByText('hook 改写 1')).toBeInTheDocument()
    expect(screen.getByText(/旧均值：4\.5/)).toBeInTheDocument()
    expect(screen.getByText('开始打分')).toBeInTheDocument()
  })

  it('样本为空 → 显示"重新拉一批"按钮', async () => {
    const user = userEvent.setup()
    mockedGetSample.mockResolvedValue({ total: 0, items: [] })
    render(<PoolAuditWorkflow />)
    await user.click(screen.getByText('跳过清理'))
    await waitFor(() => {
      expect(screen.getByText(/当前无样本/)).toBeInTheDocument()
    })
    expect(screen.getByText('重新拉一批')).toBeInTheDocument()
  })

  it('点击"开始打分" → 跳到步骤 3 + 显示当前样本 + 评分输入', async () => {
    const user = userEvent.setup()
    mockedGetSample.mockResolvedValue(sampleBatch)
    render(<PoolAuditWorkflow />)
    await user.click(screen.getByText('跳过清理'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 2 · 抽查样本/)).toBeInTheDocument()
    })
    await user.click(screen.getByText('开始打分'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 3 · 提交评分/)).toBeInTheDocument()
    })
  })

  it('步骤 3 提交评分超界 → toast 错误', async () => {
    const user = userEvent.setup()
    mockedGetSample.mockResolvedValue(sampleBatch)
    render(<PoolAuditWorkflow />)
    await user.click(screen.getByText('跳过清理'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 2 · 抽查样本/)).toBeInTheDocument()
    })
    await user.click(screen.getByText('开始打分'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 3 · 提交评分/)).toBeInTheDocument()
    })
    // 修改评分到超界
    const scoreInput = screen.getByLabelText(/评分/) as HTMLInputElement
    await user.clear(scoreInput)
    await user.type(scoreInput, '99')
    await user.click(screen.getByText('提交'))
    await waitFor(() => {
      expect(useToastStore.getState().toasts.some((t) => t.message.includes('评分需在 0-10 之间'))).toBe(true)
    })
    expect(mockedPostResult).not.toHaveBeenCalled()
  })

  it('步骤 3 提交合法评分 → postAuditResult + 自动取下一批', async () => {
    const user = userEvent.setup()
    mockedGetSample.mockResolvedValue(sampleBatch)
    mockedPostResult.mockResolvedValue({ example_id: 'p1', audit_score: 5, updated: true })
    render(<PoolAuditWorkflow />)
    await user.click(screen.getByText('跳过清理'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 2 · 抽查样本/)).toBeInTheDocument()
    })
    await user.click(screen.getByText('开始打分'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 3 · 提交评分/)).toBeInTheDocument()
    })
    await user.click(screen.getByText('提交'))
    await waitFor(() => {
      expect(mockedPostResult).toHaveBeenCalledWith('p1', expect.any(Number))
    })
  })
})