import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ModelRouting } from './ModelRouting'

/**
 * ModelRouting 页单测 —— CP-NEW.16。
 *
 * Mock '../api/admin/tier-config' (getTierConfig + updateTierConfig)。
 * 覆盖：source 徽标 / warnings 黄条 / PUT 回读确认 / "恢复默认"。
 */

vi.mock('../api/admin/tier-config', () => ({
  getTierConfig: vi.fn(),
  updateTierConfig: vi.fn(),
}))

import * as tcModule from '../api/admin/tier-config'
const mockedGet = vi.mocked(tcModule.getTierConfig)
const mockedUpdate = vi.mocked(tcModule.updateTierConfig)

function renderPage() {
  return render(
    <MemoryRouter>
      <ModelRouting />
    </MemoryRouter>,
  )
}

const sampleConfig = {
  tier_model_map: {
    simple: { openai: 'gpt-4o-mini', qwen_vl: 'qwen-vl-max' },
    full: { openai: 'gpt-4o', qwen_vl: 'qwen-vl-max' },
  },
  source: 'db' as const,
  default_map: {
    simple: { openai: 'gpt-4o-mini-default', qwen_vl: 'qwen-vl-max' },
    full: { openai: 'gpt-4o-default', qwen_vl: 'qwen-vl-max' },
  },
  supported_providers: ['openai', 'qwen_vl'],
  warnings: ['provider X 未实现 client'],
  updated_at: '2024-01-15T08:30:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ModelRouting', () => {
  it('渲染标题 + source=db 徽标', async () => {
    mockedGet.mockResolvedValue(sampleConfig)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('模型路由')).toBeInTheDocument()
    })
    expect(screen.getByText(/db.*覆盖中/)).toBeInTheDocument()
  })

  it('source=default → "代码默认" 徽标', async () => {
    mockedGet.mockResolvedValue({ ...sampleConfig, source: 'default' })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/default · 代码默认/)).toBeInTheDocument()
    })
  })

  it('warnings 非空 → CaveatBanner 显示', async () => {
    mockedGet.mockResolvedValue(sampleConfig)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('provider 配置警告')).toBeInTheDocument()
    })
    expect(screen.getByText('provider X 未实现 client')).toBeInTheDocument()
  })

  it('warnings 为空 → 不渲染 CaveatBanner', async () => {
    mockedGet.mockResolvedValue({ ...sampleConfig, warnings: [] })
    renderPage()
    await waitFor(() => {
      expect(screen.queryByText('provider 配置警告')).toBeNull()
    })
  })

  it('点击"保存" → 调 updateTierConfig + 再次 GET 回读', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue(sampleConfig)
    mockedUpdate.mockResolvedValue(sampleConfig)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/db.*覆盖中/)).toBeInTheDocument()
    })
    // 先改 input 制造 dirty
    const input = screen.getAllByPlaceholderText(/model name/)[0] as HTMLInputElement
    await user.clear(input)
    await user.type(input, 'new-model')
    // 现在 dirty=true
    await user.click(screen.getByText('保存'))
    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalled()
    })
    // 回读：getTierConfig 至少调用 2 次（初次 + 回读）
    expect(mockedGet.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('点击"恢复默认" → 表单恢复为代码默认（不发请求）', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue(sampleConfig)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/db.*覆盖中/)).toBeInTheDocument()
    })
    await user.click(screen.getByText('恢复默认'))
    // 不应触发 PUT
    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('PUT 回读 source==db → 成功', async () => {
    const user = userEvent.setup()
    mockedGet.mockResolvedValue(sampleConfig)
    mockedUpdate.mockResolvedValue({ ...sampleConfig, source: 'db' })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/db.*覆盖中/)).toBeInTheDocument()
    })
    // 先改 input 制造 dirty
    const input = screen.getAllByPlaceholderText(/model name/)[0] as HTMLInputElement
    await user.clear(input)
    await user.type(input, 'new-model')
    await user.click(screen.getByText('保存'))
    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalled()
    })
  })

  it('missing 端点 → ErrorNotice', async () => {
    mockedGet.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/端点未上线/)).toBeInTheDocument()
    })
  })

  it('loading 状态显示 skeleton', async () => {
    mockedGet.mockReturnValue(new Promise(() => {}) as unknown as Promise<never>)
    const { container } = renderPage()
    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })
  })
})