import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TtsConfigForm, type TtsConfigFields } from './TtsConfigForm'

/**
 * TtsConfigForm 单测 —— CP-NEW.20d。
 *
 * 覆盖 5 provider conditional 字段组渲染 + onProviderChange / onFieldChange 回调。
 */

const emptyFields: TtsConfigFields = {
  edgeVoice: '',
  openaiApiKey: '',
  openaiBaseUrl: '',
  openaiModel: '',
  openaiVoice: '',
  doubaoApiKey: '',
  doubaoToken: '',
  doubaoAppId: '',
  doubaoVoice: '',
  doubaoResourceId: '',
  localVoice: '',
  ffmpegBin: '',
  indexttsBaseUrl: '',
  indexttsModel: '',
  indexttsRefAudio: '',
  indexttsRefText: '',
}

function renderForm(overrides: Partial<Parameters<typeof TtsConfigForm>[0]> = {}) {
  const props = {
    provider: 'indextts' as const,
    data: emptyFields,
    apiKeySet: false,
    showApiKey: false,
    saving: false,
    testing: false,
    onProviderChange: vi.fn(),
    onFieldChange: vi.fn(),
    onToggleApiKey: vi.fn(),
    onSubmit: vi.fn(),
    onTest: vi.fn(),
    ...overrides,
  }
  render(<TtsConfigForm {...props} />)
  return props
}

describe('TtsConfigForm', () => {
  it('provider select 含 5 个选项', () => {
    renderForm()
    const select = screen.getByRole('combobox')
    const options = within(select).getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual([
      'edge',
      'openai',
      'doubao',
      'local',
      'indextts',
    ])
  })

  it('indextts provider → 渲染 base_url/model/ref_audio/ref_text 四字段', () => {
    renderForm({ provider: 'indextts' })
    expect(screen.getByText(/IndexTTS 是零样本音色克隆/)).toBeInTheDocument()
    expect(screen.getByText('参考音频转录文本（必须与音频内容一致）')).toBeInTheDocument()
  })

  it('edge provider → 只渲染 Voice 字段', () => {
    renderForm({ provider: 'edge' })
    expect(screen.getByPlaceholderText('zh-CN-XiaoxiaoNeural')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('alloy')).toBeNull()
    expect(screen.queryByText('Resource ID')).toBeNull()
  })

  it('openai provider → API key + base url + model + voice', () => {
    renderForm({ provider: 'openai' })
    expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('alloy')).toBeInTheDocument()
  })

  it('openai + apiKeySet=true → placeholder 提示已保存', () => {
    renderForm({ provider: 'openai', apiKeySet: true })
    expect(screen.getByPlaceholderText('已保存，留空则不变')).toBeInTheDocument()
  })

  it('doubao provider → API key + Token + App ID + Voice + Resource ID', () => {
    renderForm({ provider: 'doubao' })
    expect(screen.getByPlaceholderText('seed-tts-2.0')).toBeInTheDocument()
    expect(screen.getByText('Token（旧版兼容，可留空）')).toBeInTheDocument()
  })

  it('local provider → Voice + ffmpeg 路径', () => {
    renderForm({ provider: 'local' })
    expect(screen.getByPlaceholderText('Tingting（可换：Eddy/Flo/Reed/Rocko/Sandy）')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('/opt/homebrew/bin/ffmpeg')).toBeInTheDocument()
  })

  it('onToggleApiKey 点击眼睛按钮', async () => {
    const user = userEvent.setup()
    const props = renderForm({ provider: 'openai' })
    await user.click(screen.getByRole('button', { name: '显示 API key' }))
    expect(props.onToggleApiKey).toHaveBeenCalled()
  })

  it('字段输入 → onFieldChange(field, value)', async () => {
    const user = userEvent.setup()
    const props = renderForm({ provider: 'edge' })
    await user.type(screen.getByPlaceholderText('zh-CN-XiaoxiaoNeural'), 'y')
    expect(props.onFieldChange).toHaveBeenCalledWith('edgeVoice', 'y')
  })

  it('保存按钮 submitting → "保存中…"', () => {
    renderForm({ saving: true })
    expect(screen.getByText('保存中…')).toBeInTheDocument()
    expect((screen.getByText('保存中…') as HTMLButtonElement).disabled).toBe(true)
  })

  it('测试调用按钮 testing → "调用中…"', () => {
    renderForm({ testing: true })
    expect(screen.getByText('调用中…')).toBeInTheDocument()
  })

  it('provider hint 渲染', () => {
    renderForm({ provider: 'local' })
    expect(screen.getByText('macOS say + ffmpeg（零凭证、纯本地，仅 macOS）')).toBeInTheDocument()
  })
})