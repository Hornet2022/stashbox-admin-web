import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Consents } from './Consents'

/**
 * Consents 页测试 —— CP-NEW.20c。
 *
 * Mock '../api/admin/consents' (listConsents)。
 * 覆盖：隐私红线 / 表格渲染 / personalization 过滤 / 分页。
 */

vi.mock('../api/admin/consents', () => ({
  listConsents: vi.fn(),
}))

import { listConsents } from '../api/admin/consents'
const mockedList = vi.mocked(listConsents)

function renderPage() {
  return render(
    <MemoryRouter>
      <Consents />
    </MemoryRouter>,
  )
}

const sampleConsents = {
  total: 2,
  items: [
    {
      user_id: 101,
      personalization_enabled: true,
      cross_user_share_enabled: false,
      consent_version: 'v1',
      consent_at: '2024-01-15T08:30:00Z',
      created_at: '2024-01-10T00:00:00Z',
    },
    {
      user_id: 102,
      personalization_enabled: false,
      cross_user_share_enabled: true,
      consent_version: 'v2',
      consent_at: '2024-02-01T10:00:00Z',
      created_at: '2024-01-11T00:00:00Z',
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedList.mockResolvedValue(sampleConsents)
})

describe('Consents', () => {
  it('渲染标题 + 隐私红线 CaveatBanner', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('GDPR 同意')).toBeInTheDocument()
    })
    expect(screen.getByText('隐私红线')).toBeInTheDocument()
    expect(screen.getByText(/不回显 comment 类自由文本/)).toBeInTheDocument()
  })

  it('表格渲染两行 + Badge 状态', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })
    expect(screen.getByText('102')).toBeInTheDocument()
    expect(screen.getByText('v1')).toBeInTheDocument()
    expect(screen.getByText('v2')).toBeInTheDocument()
    // enabled/disabled Badge（user 101 personalization on, share off；102 反之）
    expect(screen.getAllByText('enabled').length).toBe(2)
    expect(screen.getAllByText('disabled').length).toBe(2)
  })

  it('表格固定 6 列（无 comment 类自由文本列）', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument()
    })
    const headers = screen.getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual([
      'user_id',
      'personalization',
      'cross_user_share',
      'consent_version',
      'consent_at',
      'created_at',
    ])
  })

  it('personalization 过滤 → "已开启" 传参 true', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => {
      expect(mockedList).toHaveBeenCalled()
    })
    await user.click(screen.getByRole('tab', { name: '已开启' }))
    await waitFor(() => {
      const lastCall = mockedList.mock.calls.at(-1)?.[0] as Record<string, unknown>
      expect(lastCall.personalization_enabled).toBe(true)
    })
  })

  it('点击"已关闭" → 传 false', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => {
      expect(mockedList).toHaveBeenCalled()
    })
    await user.click(screen.getByRole('tab', { name: '已关闭' }))
    await waitFor(() => {
      const lastCall = mockedList.mock.calls.at(-1)?.[0] as Record<string, unknown>
      expect(lastCall.personalization_enabled).toBe(false)
    })
  })

  it('missing 端点 → ErrorNotice', async () => {
    mockedList.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/端点未上线/)).toBeInTheDocument()
    })
  })

  it('空列表 → 兜底文案', async () => {
    mockedList.mockResolvedValue({ items: [], total: 0 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('无匹配同意记录')).toBeInTheDocument()
    })
  })

  it('时间走 formatTime（zh-CN 本地化）', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText(/^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2}$/).length).toBe(4)
    })
  })
})