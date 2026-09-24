import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Tags } from './Tags'

/**
 * Tags 页单测 —— CP-NEW.14。
 *
 * Mock '../api/admin' (listTags/createTag/deleteAdminTag) 与 '../hooks/useRole' (super_admin)。
 * 覆盖：标题 / 新增按钮 / 导出按钮 / 行内删除按钮 / missing 端点 / loading skeleton。
 *
 * 注：listTags 行内容涉及多字段（slug/name/description/subscriber_count/is_system），
 * 详细断言在 component-level 测试中更合适。这里专注 page-level 渲染契约。
 */

vi.mock('../api/admin', () => ({
  listTags: vi.fn(),
  createTag: vi.fn(),
  deleteAdminTag: vi.fn(),
}))

vi.mock('../hooks/useRole', () => ({
  useRole: () => 'super_admin',
  hasPermission: () => true,
}))

import * as adminModule from '../api/admin'
const mockedListTags = vi.mocked(adminModule.listTags)

function renderTags() {
  return render(
    <MemoryRouter>
      <Tags />
    </MemoryRouter>,
  )
}

const sampleTags = {
  total: 2,
  items: [
    { id: 1, slug: 'tech', name: 'tech', description: undefined, subscriber_count: 10, is_system: false, created_at: '2024-01-15T08:30:00Z' },
    { id: 2, slug: 'ai', name: 'ai', description: undefined, subscriber_count: 8, is_system: false, created_at: '2024-01-16T08:30:00Z' },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Tags', () => {
  it('渲染标题 + 新增按钮 + 导出按钮', async () => {
    mockedListTags.mockResolvedValue(sampleTags)
    renderTags()
    await waitFor(() => {
      expect(screen.getByText('标签管理')).toBeInTheDocument()
    })
    expect(screen.getByText('新增标签')).toBeInTheDocument()
    expect(screen.getByText('导出 CSV')).toBeInTheDocument()
  })

  it('列表渲染：tech / ai 名字都出现', async () => {
    mockedListTags.mockResolvedValue(sampleTags)
    renderTags()
    await waitFor(() => {
      // tech 出现两次（slug + name），用 getAllByText
      expect(screen.getAllByText('tech').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText('ai').length).toBeGreaterThanOrEqual(1)
  })

  it('点击新增按钮 → 打开 Modal + 看到 placeholder', async () => {
    const user = userEvent.setup()
    mockedListTags.mockResolvedValue(sampleTags)
    renderTags()
    await waitFor(() => {
      expect(screen.getAllByText('tech').length).toBeGreaterThanOrEqual(1)
    })
    await user.click(screen.getByText('新增标签'))
    expect(screen.getByPlaceholderText(/machine-learning/)).toBeInTheDocument()
  })

  it('missing 端点 → ErrorNotice', async () => {
    mockedListTags.mockRejectedValue({ response: { status: 404 } })
    renderTags()
    await waitFor(() => {
      expect(screen.getByText(/端点未上线/)).toBeInTheDocument()
    })
  })

  it('loading 状态显示 skeleton', async () => {
    mockedListTags.mockReturnValue(new Promise(() => {}) as unknown as Promise<never>)
    const { container } = renderTags()
    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })
  })

  it('行内删除按钮存在', async () => {
    mockedListTags.mockResolvedValue(sampleTags)
    renderTags()
    await waitFor(() => {
      expect(screen.getAllByText('tech').length).toBeGreaterThanOrEqual(1)
    })
    const deleteBtns = screen.getAllByRole('button', { name: /删除标签/ })
    expect(deleteBtns.length).toBe(2)
  })

  it('空列表 → "无匹配标签" 兜底', async () => {
    mockedListTags.mockResolvedValue({ total: 0, items: [] })
    renderTags()
    await waitFor(() => {
      expect(screen.getByText(/无匹配标签|暂无标签/)).toBeInTheDocument()
    })
  })
})