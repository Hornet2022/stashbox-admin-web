import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Evaluations } from './Evaluations'
import { useAuthStore } from '../store/auth'

/**
 * Evaluations 页测试 —— CP-NEW.20c。
 *
 * Mock '../api/admin/evaluations' (listEvaluations/getAgreement/annotateEvaluation)。
 * 覆盖：agreement 卡 / 列表渲染 / auto_flag 过滤 / 标注弹窗 / 提交校验 / operator 权限。
 */

vi.mock('../api/admin/evaluations', () => ({
  listEvaluations: vi.fn(),
  getAgreement: vi.fn(),
  annotateEvaluation: vi.fn(),
}))

import * as evalModule from '../api/admin/evaluations'
const mockedList = vi.mocked(evalModule.listEvaluations)
const mockedAgreement = vi.mocked(evalModule.getAgreement)
const mockedAnnotate = vi.mocked(evalModule.annotateEvaluation)

function renderPage() {
  return render(
    <MemoryRouter>
      <Evaluations />
    </MemoryRouter>,
  )
}

const sampleEvals = {
  total: 2,
  items: [
    {
      id: 'ev-1',
      task_id: 'task-a',
      user_id: 3,
      hook_score: 4,
      section_score: 3,
      outro_score: null,
      rhythm_score: 4,
      overall_score: 4.2,
      skip_reason: null,
      auto_flag: false,
      retried_task_id: null,
      created_at: '2024-01-15T08:30:00Z',
    },
    {
      id: 'ev-2',
      task_id: 'task-b',
      user_id: null,
      hook_score: null,
      section_score: null,
      outro_score: null,
      rhythm_score: null,
      overall_score: 2.1,
      skip_reason: '用户跳过',
      auto_flag: true,
      retried_task_id: 'task-c',
      created_at: '2024-01-16T08:30:00Z',
    },
  ],
}

const sampleAgreement = { agreement: 0.85, evaluator_count: 4, annotated_count: 20, task_filter: null }

beforeEach(() => {
  vi.clearAllMocks()
  // super_admin 可标注
  useAuthStore.setState({ isAuthenticated: true, role: 'super_admin', userId: 1 })
  mockedList.mockResolvedValue(sampleEvals)
  mockedAgreement.mockResolvedValue(sampleAgreement)
})

describe('Evaluations', () => {
  it('渲染标题 + 一致性卡', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('评测标注')).toBeInTheDocument()
    })
    expect(screen.getByText(/评测员一致性/)).toBeInTheDocument()
    // agreement 0.85 → success 染色
    const agreeEl = screen.getByText('0.85')
    expect(agreeEl.className).toMatch(/text-success/)
  })

  it('agreement < 0.6 → error 染色', async () => {
    mockedAgreement.mockResolvedValue({ ...sampleAgreement, agreement: 0.5 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('0.50').className).toMatch(/text-error/)
    })
  })

  it('列表渲染评分行', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('ev-1')).toBeInTheDocument()
    })
    expect(screen.getByText('task-a')).toBeInTheDocument()
    expect(screen.getByText('4.2')).toBeInTheDocument()
    expect(screen.getByText('用户跳过')).toBeInTheDocument()
    // auto_flag Badge
    expect(screen.getByText('system')).toBeInTheDocument()
    expect(screen.getByText('user')).toBeInTheDocument()
  })

  it('null 评分 → 显示 "—"', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('ev-2')).toBeInTheDocument()
    })
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4)
  })

  it('auto_flag 过滤 tab：用户提交 → listEvaluations auto_flag=false', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => {
      expect(mockedList).toHaveBeenCalled()
    })
    await user.click(screen.getByRole('tab', { name: '用户提交' }))
    await waitFor(() => {
      const lastCall = mockedList.mock.calls.at(-1)?.[0] as Record<string, unknown>
      expect(lastCall.auto_flag).toBe(false)
    })
  })

  it('点击"标注" → 打开 AnnotateDialog', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('ev-1')).toBeInTheDocument()
    })
    const annotateBtns = screen.getAllByText('标注')
    await user.click(annotateBtns[0])
    expect(screen.getByText('评测员标注')).toBeInTheDocument()
    // 弹窗内展示原 evaluation id + task_id（文本被 span 拆分，用正则找 dialog 描述行）
    const desc = screen.getByText(/原 id/)
    expect(desc.textContent).toContain('ev-1')
    expect(desc.textContent).toContain('task-a')
  })

  it('标注弹窗：overall 必填 1-5 + 提交校验', async () => {
    const user = userEvent.setup()
    mockedAnnotate.mockResolvedValue({
      id: 'ann-1',
      annotates: 'ev-1',
      task_id: 'task-a',
      evaluator_id: 9,
      overall_score: 5,
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('ev-1')).toBeInTheDocument()
    })
    await user.click(screen.getAllByText('标注')[0])
    const overall = screen.getByLabelText(/overall \*/) as HTMLInputElement
    await user.clear(overall)
    await user.type(overall, '5')
    await user.click(screen.getByText('提交标注'))
    await waitFor(() => {
      expect(mockedAnnotate).toHaveBeenCalledWith(
        'ev-1',
        expect.objectContaining({ overall_score: 5 }),
      )
    })
  })

  it('operator 角色 → 标注可用', async () => {
    useAuthStore.setState({ role: 'operator' })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('ev-1')).toBeInTheDocument()
    })
    expect(screen.getAllByText('标注').length).toBeGreaterThan(0)
  })

  it('viewer 角色 → 标注禁用（显示 —）', async () => {
    useAuthStore.setState({ role: null })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('ev-1')).toBeInTheDocument()
    })
    expect(screen.queryByText('标注')).toBeNull()
  })

  it('missing 端点 → ErrorNotice', async () => {
    mockedList.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/端点未上线/)).toBeInTheDocument()
    })
  })

  it('空列表 → "无匹配评分"', async () => {
    mockedList.mockResolvedValue({ items: [], total: 0 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('无匹配评分')).toBeInTheDocument()
    })
  })
})