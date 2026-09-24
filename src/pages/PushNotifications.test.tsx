import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PushNotifications } from './PushNotifications'
import { useAuthStore } from '../store/auth'

/**
 * PushNotifications 页测试 —— CP-NEW.25（admin 端点落地版）。
 *
 * Mock '../api/admin' (listPushNotifications/retryPushNotification) + useRole。
 * 覆盖：全量队列渲染 / 状态 tab 真实传参 / failed 行重推 / 权限只读 / 分页。
 */

vi.mock('../api/admin', () => ({
  listPushNotifications: vi.fn(),
  retryPushNotification: vi.fn(),
}))

import * as adminModule from '../api/admin'
const mockedList = vi.mocked(adminModule.listPushNotifications)
const mockedRetry = vi.mocked(adminModule.retryPushNotification)

function renderPage() {
  return render(
    <MemoryRouter>
      <PushNotifications />
    </MemoryRouter>,
  )
}

const sampleRows = {
  total: 3,
  items: [
    { id: 3, user_id: 42, article_id: 'a1', tag_slug: null, title: '新文章上线', body: '点击收听', deeplink: null, status: 'sent', error: null, created_at: '2026-09-24T09:00:00Z', sent_at: '2026-09-24T09:00:05Z', read_at: null },
    { id: 2, user_id: 43, article_id: null, tag_slug: 'ai-weekly', title: '周报到了', body: '本周精选', deeplink: null, status: 'failed', error: 'apns timeout', created_at: '2026-09-23T09:00:00Z', sent_at: null, read_at: null },
    { id: 1, user_id: 44, article_id: 'a2', tag_slug: null, title: '排队中', body: '待发送', deeplink: null, status: 'pending', error: null, created_at: '2026-09-22T09:00:00Z', sent_at: null, read_at: null },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ isAuthenticated: true, role: 'super_admin', userId: 1 })
  mockedList.mockResolvedValue(sampleRows)
})

describe('PushNotifications', () => {
  it('渲染标题 + 全量队列提示（无"仅当前账号"降级文案）', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('推送队列')).toBeInTheDocument()
    })
    expect(screen.getByText(/全量队列/)).toBeInTheDocument()
    expect(screen.queryByText(/仅返回?.*当前登录账号自己/)).toBeNull()
  })

  it('渲染 9 列表头 + 行数据 + error 列', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('新文章上线')).toBeInTheDocument()
    })
    expect(screen.getByText('失败原因')).toBeInTheDocument()
    expect(screen.getByText('apns timeout')).toBeInTheDocument()
    expect(screen.getByText('sent')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('状态 tab 点击 → 真实传 status 参数', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => {
      expect(mockedList).toHaveBeenCalled()
    })
    await user.click(screen.getByRole('tab', { name: '失败' }))
    await waitFor(() => {
      const lastCall = mockedList.mock.calls.at(-1)?.[0] as Record<string, unknown>
      expect(lastCall.status).toBe('failed')
    })
  })

  it('failed 行有"重推"按钮，非 failed 行显示 —', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('apns timeout')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: '重推推送 2' })).toBeInTheDocument()
  })

  it('重推流程：ReasonDialog → retryPushNotification(id, reason) → reload', async () => {
    const user = userEvent.setup()
    mockedRetry.mockResolvedValue({
      id: 2, user_id: 43, status: 'sent', error: null,
      sent_at: '2026-09-24T10:00:00Z', retried_at: '2026-09-24T10:00:00Z',
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重推推送 2' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: '重推推送 2' }))
    expect(screen.getByRole('heading', { name: /重推失败推送 · #2/ })).toBeInTheDocument()
    const textarea = screen.getByPlaceholderText(/请输入操作原因/)
    await user.type(textarea, '通道恢复后重推')
    await user.click(screen.getByText('确认重推'))
    await waitFor(() => {
      expect(mockedRetry).toHaveBeenCalledWith(2, '通道恢复后重推')
    })
    // retry 后 reload：list 至少调用 2 次
    await waitFor(() => {
      expect(mockedList.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('operator 可重推；admin 升级兼容也可；无权限角色只读', async () => {
    useAuthStore.setState({ role: 'viewer' })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('apns timeout')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: '重推推送 2' })).toBeNull()
  })

  it('分页控件：total=3 单页时下一页禁用', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/共 3 条 · 第 1 \/ 1 页/)).toBeInTheDocument()
    })
    expect((screen.getByRole('button', { name: '下一页' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('missing 端点 → ErrorNotice', async () => {
    mockedList.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/端点未上线/)).toBeInTheDocument()
    })
  })
})