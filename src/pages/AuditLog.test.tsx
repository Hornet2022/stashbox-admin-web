import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuditLog } from './AuditLog'

/**
 * AuditLog 页单测 —— CP-NEW.14。
 *
 * Mock '../api/admin' 的 listAuditLog + useRole。
 * 覆盖：日志表格渲染 / 时间格式化 / 状态 Badge / 翻页 / 错误状态。
 */

vi.mock('../api/admin', () => ({
  listAuditLog: vi.fn(),
}))

vi.mock('../hooks/useRole', () => ({
  useRole: () => 'super_admin',
  hasPermission: () => true,
}))

import * as adminModule from '../api/admin'
const mockedListAuditLog = vi.mocked(adminModule.listAuditLog)

function renderAuditLog() {
  return render(
    <MemoryRouter>
      <AuditLog />
    </MemoryRouter>,
  )
}

const sampleLogs = {
  total: 50,
  limit: 50,
  offset: 0,
  items: [
    {
      id: 1,
      user_id: 42,
      action_type: 'article.delete',
      target_type: 'article',
      target_id: 'art-123',
      created_at: '2024-01-15T08:30:00Z',
    },
    {
      id: 2,
      user_id: 7,
      action_type: 'tts.config.update',
      target_type: 'tts_config',
      target_id: null,
      created_at: '2024-01-16T10:00:00Z',
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuditLog', () => {
  it('渲染标题 + 表头 6 列', async () => {
    mockedListAuditLog.mockResolvedValue(sampleLogs)
    renderAuditLog()
    await waitFor(() => {
      expect(screen.getByText('审计日志')).toBeInTheDocument()
    })
    // 表头列：注意 Field label "操作人 ID" 也含同名文本，所以用 getAllByText
    expect(screen.getAllByText('ID').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('动作')).toBeInTheDocument()
    expect(screen.getByText('对象类型')).toBeInTheDocument()
    expect(screen.getByText('对象 ID')).toBeInTheDocument()
    expect(screen.getByText('时间')).toBeInTheDocument()
  })

  it('渲染日志条目', async () => {
    mockedListAuditLog.mockResolvedValue(sampleLogs)
    renderAuditLog()
    await waitFor(() => {
      expect(screen.getByText('article.delete')).toBeInTheDocument()
    })
    expect(screen.getByText('tts.config.update')).toBeInTheDocument()
    expect(screen.getByText('article')).toBeInTheDocument()
    expect(screen.getByText('tts_config')).toBeInTheDocument()
    expect(screen.getByText('art-123')).toBeInTheDocument()
  })

  it('时间走 formatTime(zh-CN)', async () => {
    mockedListAuditLog.mockResolvedValue(sampleLogs)
    renderAuditLog()
    await waitFor(() => {
      // formatTime 走 zh-CN locale: YYYY/M/D HH:mm:ss
      expect(screen.getAllByText(/^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2}$/).length).toBe(2)
    })
  })

  it('target_id=null → 显示 "—"', async () => {
    mockedListAuditLog.mockResolvedValue(sampleLogs)
    renderAuditLog()
    await waitFor(() => {
      expect(screen.getByText('tts.config.update')).toBeInTheDocument()
    })
    // "—" 在空字段上至少出现 1 次（target_id null）
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  it('missing 端点 → ErrorNotice 显示 "端点未上线：端点不存在（404 / 501）"', async () => {
    mockedListAuditLog.mockRejectedValue({ response: { status: 404 } })
    renderAuditLog()
    await waitFor(() => {
      expect(screen.getByText(/端点未上线/)).toBeInTheDocument()
    })
  })

  it('loading 状态显示骨架', async () => {
    mockedListAuditLog.mockReturnValue(new Promise(() => {}) as unknown as Promise<never>)
    const { container } = renderAuditLog()
    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })
  })

  it('查询参数带 page + size（默认 page=1 / size=50）', async () => {
    mockedListAuditLog.mockResolvedValue(sampleLogs)
    renderAuditLog()
    await waitFor(() => {
      expect(mockedListAuditLog).toHaveBeenCalled()
    })
    const firstCall = mockedListAuditLog.mock.calls[0][0] as Record<string, unknown>
    expect(firstCall.page).toBe(1)
    expect(firstCall.size).toBe(50)
  })
})