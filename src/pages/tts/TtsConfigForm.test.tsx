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
  openaiInstructions: '',
  openaiRefAudio: '',
  openaiRefText: '',
  openaiLanguage: '',
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
    // 分 provider 的「这把 key 有没有」（后端 2026-10-22 加，共用的 apiKeySet 会串台）
    openaiApiKeySet: false,
    doubaoApiKeySet: false,
    showApiKey: false,
    saving: false,
    testing: false,
    onProviderChange: vi.fn(),
    onFieldChange: vi.fn(),
    onToggleApiKey: vi.fn(),
    onClearApiKey: vi.fn(),
    onSubmit: vi.fn(),
    onTest: vi.fn(),
    // 探测音色（2026-10-21）
    onProbeVoices: vi.fn(),
    probing: false,
    supportedVoices: [],
    voiceProbeHint: null,
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

  it('openai + openaiApiKeySet=true → placeholder 提示已保存', () => {
    renderForm({ provider: 'openai', openaiApiKeySet: true })
    expect(screen.getByPlaceholderText('已保存，留空则不变')).toBeInTheDocument()
  })

  it('豆包那把 key 不该让 openai 那一栏显示「已保存」', () => {
    // 共用 apiKeySet 的老做法会串台：豆包 env 有 key → openai 栏也显示已保存，
    // 而 openai 其实根本没存 —— 运营因此以为「不用管」。
    renderForm({ provider: 'openai', openaiApiKeySet: false, doubaoApiKeySet: true })
    expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument()
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

  // ── 探测音色（2026-10-21）────────────────────────────────────────
  it('openai 的 voice 字段后有「探测可用音色」按钮', () => {
    renderForm({ provider: 'openai' })
    expect(screen.getByRole('button', { name: '探测可用音色' })).toBeInTheDocument()
  })

  it('点「探测可用音色」→ onProbeVoices 被调用', async () => {
    const user = userEvent.setup()
    const props = renderForm({ provider: 'openai' })
    await user.click(screen.getByRole('button', { name: '探测可用音色' }))
    expect(props.onProbeVoices).toHaveBeenCalled()
  })

  it('探测中按钮禁用且文案变「探测中…」', () => {
    renderForm({ provider: 'openai', probing: true })
    const btn = screen.getByRole('button', { name: '探测中…' })
    expect(btn).toBeInTheDocument()
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('supportedVoices 非空 → 渲染成候选按钮', () => {
    renderForm({
      provider: 'openai',
      supportedVoices: ['aiden', 'vivian'],
    })
    expect(screen.getByRole('button', { name: 'aiden' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'vivian' })).toBeInTheDocument()
  })

  it('点候选音色 → onFieldChange("openaiVoice", 音色名)', async () => {
    const user = userEvent.setup()
    const props = renderForm({
      provider: 'openai',
      supportedVoices: ['aiden', 'vivian'],
    })
    await user.click(screen.getByRole('button', { name: 'vivian' }))
    expect(props.onFieldChange).toHaveBeenCalledWith('openaiVoice', 'vivian')
  })

  it('supportedVoices 为空 → 不渲染候选区', () => {
    renderForm({ provider: 'openai', supportedVoices: [] })
    expect(screen.queryByRole('button', { name: 'aiden' })).not.toBeInTheDocument()
  })

  it('voiceProbeHint 有值 → 渲染提示文案', () => {
    renderForm({
      provider: 'openai',
      voiceProbeHint: '该服务接受任意音色名（不校验），无法探测可用列表。',
    })
    expect(
      screen.getByText('该服务接受任意音色名（不校验），无法探测可用列表。'),
    ).toBeInTheDocument()
  })

  it('探测按钮只在 openai provider 下出现（其它 provider 没有音色列表概念）', () => {
    renderForm({ provider: 'doubao' })
    expect(screen.queryByRole('button', { name: '探测可用音色' })).not.toBeInTheDocument()
  })

  // ── 风格控制 instructions（2026-10-23）──────────────────────────
  it('openai provider → 渲染「风格控制」输入框', () => {
    renderForm({ provider: 'openai' })
    expect(screen.getByLabelText('风格控制（Instructions）')).toBeInTheDocument()
  })

  it('编辑风格控制 → onFieldChange("openaiInstructions", 内容)', async () => {
    const user = userEvent.setup()
    const props = renderForm({ provider: 'openai' })
    await user.type(screen.getByLabelText('风格控制（Instructions）'), '播')
    expect(props.onFieldChange).toHaveBeenCalledWith('openaiInstructions', '播')
  })

  it('非 openai provider → 不渲染「风格控制」输入框', () => {
    renderForm({ provider: 'doubao' })
    expect(screen.queryByLabelText('风格控制（Instructions）')).not.toBeInTheDocument()
  })

  // ── 清除已保存的 Key（2026-10-22）───────────────────────────────
  it('openai 存了 key → 渲染「清除已保存的 Key」按钮', () => {
    renderForm({ provider: 'openai', openaiApiKeySet: true })
    expect(screen.getByRole('button', { name: '清除已保存的 Key' })).toBeInTheDocument()
  })

  it('openai 没存 key → 不渲染清除按钮', () => {
    renderForm({ provider: 'openai', openaiApiKeySet: false })
    expect(screen.queryByRole('button', { name: '清除已保存的 Key' })).not.toBeInTheDocument()
  })

  it('点「清除已保存的 Key」→ onClearApiKey("openai")', async () => {
    const user = userEvent.setup()
    const props = renderForm({ provider: 'openai', openaiApiKeySet: true })
    await user.click(screen.getByRole('button', { name: '清除已保存的 Key' }))
    expect(props.onClearApiKey).toHaveBeenCalledWith('openai')
  })

  it('confirmClear=openai → 按钮变成「确认清除？」', () => {
    renderForm({ provider: 'openai', openaiApiKeySet: true, confirmClear: 'openai' })
    expect(screen.getByRole('button', { name: '确认清除？' })).toBeInTheDocument()
  })

  it('豆包存了 key → 清除按钮回调带 doubao', async () => {
    const user = userEvent.setup()
    const props = renderForm({ provider: 'doubao', doubaoApiKeySet: true })
    await user.click(screen.getByRole('button', { name: '清除已保存的 Key' }))
    expect(props.onClearApiKey).toHaveBeenCalledWith('doubao')
  })
})