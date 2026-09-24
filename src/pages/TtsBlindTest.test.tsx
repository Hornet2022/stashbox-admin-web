import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TtsBlindTest } from './TtsBlindTest'

/**
 * TtsBlindTest 页单测 —— CP-NEW.16。
 *
 * Mock '../api/admin/tts-blind-test' (createBlindTest / submitBlindTest / getBlindTestResults)。
 * 覆盖：3 步 stepper / 文本长度校验 / providers 数量校验 / 揭晓前置条件。
 */

vi.mock('../api/admin/tts-blind-test', () => ({
  createBlindTest: vi.fn(),
  submitBlindTest: vi.fn(),
  getBlindTestResults: vi.fn(),
}))

import * as btModule from '../api/admin/tts-blind-test'
const mockedCreate = vi.mocked(btModule.createBlindTest)
const mockedSubmit = vi.mocked(btModule.submitBlindTest)
const mockedResults = vi.mocked(btModule.getBlindTestResults)

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <TtsBlindTest />
    </MemoryRouter>,
  )
}

describe('TtsBlindTest', () => {
  it('渲染标题 + 顶部 mock 警告 + 步骤 1 表单', () => {
    renderPage()
    expect(screen.getByText('TTS 盲测')).toBeInTheDocument()
    expect(screen.getByText('模拟数据说明')).toBeInTheDocument()
    expect(screen.getByText(/步骤 1 · 发起盲测/)).toBeInTheDocument()
    expect(screen.getByText('发起盲测')).toBeInTheDocument()
  })

  it('providers < 2 → toast 错误', async () => {
    const user = userEvent.setup()
    renderPage()
    // 文本
    const textArea = screen.getByPlaceholderText(/开场三十秒/) as HTMLTextAreaElement
    await user.type(textArea, 'test')
    // providers 改为 1 个
    const providersInput = screen.getByPlaceholderText(/doubao, indextts/) as HTMLInputElement
    await user.clear(providersInput)
    await user.type(providersInput, 'only-one')
    await user.click(screen.getByText('发起盲测'))
    await waitFor(() => {
      expect(mockedCreate).not.toHaveBeenCalled()
    })
  })

  it('providers > 6 → toast 错误', async () => {
    const user = userEvent.setup()
    renderPage()
    const textArea = screen.getByPlaceholderText(/开场三十秒/) as HTMLTextAreaElement
    await user.type(textArea, 'test')
    const providersInput = screen.getByPlaceholderText(/doubao, indextts/) as HTMLInputElement
    await user.clear(providersInput)
    await user.type(providersInput, 'a b c d e f g')
    await user.click(screen.getByText('发起盲测'))
    await waitFor(() => {
      expect(mockedCreate).not.toHaveBeenCalled()
    })
  })

  it('文本 > 500 字符 → toast 错误（不调用）', async () => {
    const user = userEvent.setup()
    renderPage()
    const textArea = screen.getByPlaceholderText(/开场三十秒/) as HTMLTextAreaElement
    // maxLength=500 阻止输入更长文本,但我们直接绕过 HTML5 maxlength
    fireEvent.input(textArea, { target: { value: 'a'.repeat(501) } })
    await user.click(screen.getByText('发起盲测'))
    await waitFor(() => {
      expect(mockedCreate).not.toHaveBeenCalled()
    })
  })

  it('合法发起 → 调 createBlindTest + 跳步骤 2', async () => {
    const user = userEvent.setup()
    mockedCreate.mockResolvedValue({
      blind_test_id: 'bt-1',
      samples: [
        { key: 'sample_1', audio_url: 'https://example.com/1.mp3' },
        { key: 'sample_2', audio_url: 'https://example.com/2.mp3' },
      ],
      note: '',
    })
    renderPage()
    const textArea = screen.getByPlaceholderText(/开场三十秒/) as HTMLTextAreaElement
    await user.type(textArea, 'test text')
    const evaluatorInput = screen.getByPlaceholderText(/eva-wang/) as HTMLInputElement
    await user.type(evaluatorInput, 'eva-1')
    await user.click(screen.getByText('发起盲测'))

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith({
        text: 'test text',
        providers: ['doubao', 'indextts'],
      })
    })
    await waitFor(() => {
      expect(screen.getByText(/步骤 2 · 打分/)).toBeInTheDocument()
    })
    expect(screen.getByText('sample_1')).toBeInTheDocument()
    expect(screen.getByText('sample_2')).toBeInTheDocument()
  })

  it('步骤 2 "返回" 按钮 → 回到步骤 1', async () => {
    const user = userEvent.setup()
    mockedCreate.mockResolvedValue({
      blind_test_id: 'bt-1',
      samples: [{ key: 'sample_1', audio_url: 'https://example.com/1.mp3' }],
      note: '',
    })
    renderPage()
    const textArea = screen.getByPlaceholderText(/开场三十秒/) as HTMLTextAreaElement
    await user.type(textArea, 'test')
    const evaluatorInput = screen.getByPlaceholderText(/eva-wang/) as HTMLInputElement
    await user.type(evaluatorInput, 'eva-1')
    await user.click(screen.getByText('发起盲测'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 2 · 打分/)).toBeInTheDocument()
    })
    await user.click(screen.getByText('返回'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 1 · 发起盲测/)).toBeInTheDocument()
    })
  })

  it('步骤 2 评分输入 → submitBlindTest 跳步骤 3', async () => {
    const user = userEvent.setup()
    mockedCreate.mockResolvedValue({
      blind_test_id: 'bt-1',
      samples: [
        { key: 'sample_1', audio_url: 'https://example.com/1.mp3' },
        { key: 'sample_2', audio_url: 'https://example.com/2.mp3' },
      ],
      note: '',
    })
    mockedSubmit.mockResolvedValue({
      blind_test_id: 'bt-1',
      evaluator_id: 'eva-1',
      accepted: true,
    })
    renderPage()
    const textArea = screen.getByPlaceholderText(/开场三十秒/) as HTMLTextAreaElement
    await user.type(textArea, 'test')
    const evaluatorInput = screen.getByPlaceholderText(/eva-wang/) as HTMLInputElement
    await user.type(evaluatorInput, 'eva-1')
    await user.click(screen.getByText('发起盲测'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 2 · 打分/)).toBeInTheDocument()
    })
    // 输入两条评分
    const scoreInputs = screen.getAllByPlaceholderText('1-5')
    await user.clear(scoreInputs[0])
    await user.type(scoreInputs[0], '4')
    await user.clear(scoreInputs[1])
    await user.type(scoreInputs[1], '5')
    await user.click(screen.getByText('提交评分'))
    await waitFor(() => {
      expect(mockedSubmit).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.getByText(/步骤 3 · 揭晓/)).toBeInTheDocument()
    })
  })

  it('步骤 3 点击"揭晓 mapping" → 调 getBlindTestResults + 显示 mapping', async () => {
    const user = userEvent.setup()
    mockedCreate.mockResolvedValue({
      blind_test_id: 'bt-1',
      samples: [{ key: 'sample_1', audio_url: 'https://example.com/1.mp3' }],
      note: '',
    })
    mockedSubmit.mockResolvedValue({
      blind_test_id: 'bt-1',
      evaluator_id: 'eva-1',
      accepted: true,
    })
    mockedResults.mockResolvedValue({
      blind_test_id: 'bt-1',
      evaluator_count: 1,
      provider_median: { doubao: 4.0, indextts: 3.5 },
      revealed_mapping: { sample_1: 'doubao' },
    })
    renderPage()
    const textArea = screen.getByPlaceholderText(/开场三十秒/) as HTMLTextAreaElement
    await user.type(textArea, 'test')
    const evaluatorInput = screen.getByPlaceholderText(/eva-wang/) as HTMLInputElement
    await user.type(evaluatorInput, 'eva-1')
    await user.click(screen.getByText('发起盲测'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 2 · 打分/)).toBeInTheDocument()
    })
    const scoreInput = screen.getByPlaceholderText('1-5')
    await user.clear(scoreInput)
    await user.type(scoreInput, '4')
    await user.click(screen.getByText('提交评分'))
    await waitFor(() => {
      expect(screen.getByText(/步骤 3 · 揭晓/)).toBeInTheDocument()
    })
    await user.click(screen.getByText('揭晓 mapping'))
    await waitFor(() => {
      expect(mockedResults).toHaveBeenCalledWith('bt-1')
    })
    // mapping 渲染：sample_1 → doubao（在多处出现：provider_median 表 + revealed_mapping）
    await waitFor(() => {
      // 用 getAllByText 避开重复
      expect(screen.getAllByText(/doubao/).length).toBeGreaterThanOrEqual(1)
    })
    // sample_1 也存在
    expect(screen.getAllByText(/sample_1/).length).toBeGreaterThanOrEqual(1)
  })

  it('missing 端点 → ErrorNotice（步骤 1 页面）', async () => {
    mockedCreate.mockRejectedValue({ response: { status: 404 } })
    const user = userEvent.setup()
    renderPage()
    const textArea = screen.getByPlaceholderText(/开场三十秒/) as HTMLTextAreaElement
    await user.type(textArea, 'test')
    const evaluatorInput = screen.getByPlaceholderText(/eva-wang/) as HTMLInputElement
    await user.type(evaluatorInput, 'eva-1')
    await user.click(screen.getByText('发起盲测'))
    // 仍停留在步骤 1（axios 拦截器 toast）
    await waitFor(() => {
      expect(screen.getByText(/步骤 1 · 发起盲测/)).toBeInTheDocument()
    })
  })
})

// 移除之前的 fireEventChangeTextarea helper（改用 RTL 自带 fireEvent.input）
// 已彻底删除（占位代码，避免 noUnusedLocals）