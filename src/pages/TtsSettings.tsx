import { useEffect, useState, type FormEvent } from 'react'
import { getTtsConfig, probeTtsVoices, testTts, updateTtsConfig } from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import { toast } from '../store/toast'
import { ErrorNotice, pageHintClass, pageTitleClass } from '../components/ui'
import { CurrentConfigCard } from './tts/CurrentConfigCard'
import { TtsConfigForm, type TtsConfigFields } from './tts/TtsConfigForm'
import { TtsTestPanel } from './tts/TtsTestPanel'
import { toastForTtsTestResult } from './tts/ttsTestMessages'
import { DEFAULT_VALUES, type TtsProvider } from './tts/constants'
import type { TtsTestResult } from '../types'

/**
 * TTS 配置页（CP TTS-Config）—— GET/PUT /api/v1/admin/tts/config + /test。
 *
 * 5 个 provider：edge / openai / doubao / local / indextts（mock 不暴露）。
 * 保存后端立即 reload factory（热生效，不用重启 ai-service）。
 *
 * CP-NEW.7：原 527 行单文件 → 拆分后 ~210 行主控 + 4 子文件。
 */
export function TtsSettings() {
  const { data, loading, error, missing, reload } = useApi(getTtsConfig, 'tts-config')

  const [provider, setProvider] = useState<TtsProvider>('indextts')
  const [fields, setFields] = useState<TtsConfigFields>({
    edgeVoice: DEFAULT_VALUES.edgeVoice,
    openaiApiKey: '',
    openaiBaseUrl: DEFAULT_VALUES.openaiBaseUrl,
    openaiModel: DEFAULT_VALUES.openaiModel,
    openaiVoice: DEFAULT_VALUES.openaiVoice,
    doubaoApiKey: '',
    doubaoToken: '',
    doubaoAppId: '',
    doubaoVoice: DEFAULT_VALUES.doubaoVoice,
    doubaoResourceId: DEFAULT_VALUES.doubaoResourceId,
    localVoice: DEFAULT_VALUES.localVoice,
    ffmpegBin: DEFAULT_VALUES.ffmpegBin,
    indexttsBaseUrl: DEFAULT_VALUES.indexttsBaseUrl,
    indexttsModel: DEFAULT_VALUES.indexttsModel,
    indexttsRefAudio: '',
    indexttsRefText: '',
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TtsTestResult | null>(null)
  /** 探测可用音色（2026-10-21） */
  const [probing, setProbing] = useState(false)
  const [supportedVoices, setSupportedVoices] = useState<string[]>([])
  const [voiceProbeHint, setVoiceProbeHint] = useState<string | null>(null)

  /** 后端 GET 配置 → 同步进表单（仅第一次 + reload 后） */
  useEffect(() => {
    if (!data) return
    setProvider((data.provider as TtsProvider) || 'indextts')
    setFields((prev) => ({
      ...prev,
      edgeVoice: data.edge_voice ?? DEFAULT_VALUES.edgeVoice,
      openaiBaseUrl: data.openai_base_url ?? DEFAULT_VALUES.openaiBaseUrl,
      openaiModel: data.openai_model ?? DEFAULT_VALUES.openaiModel,
      openaiVoice: data.openai_voice ?? DEFAULT_VALUES.openaiVoice,
      doubaoVoice: data.doubao_voice ?? DEFAULT_VALUES.doubaoVoice,
      doubaoResourceId: data.doubao_resource_id ?? DEFAULT_VALUES.doubaoResourceId,
      localVoice: data.local_voice ?? DEFAULT_VALUES.localVoice,
      ffmpegBin: data.ffmpeg_bin ?? DEFAULT_VALUES.ffmpegBin,
      indexttsBaseUrl: data.indextts_base_url ?? DEFAULT_VALUES.indexttsBaseUrl,
      indexttsModel: data.indextts_model ?? DEFAULT_VALUES.indexttsModel,
      indexttsRefAudio: data.indextts_ref_audio ?? '',
      indexttsRefText: data.indextts_ref_text ?? '',
      // 各种 key 留空（"留空不改动"语义）
      openaiApiKey: '',
      doubaoApiKey: '',
      doubaoToken: '',
      doubaoAppId: '',
    }))
    setShowApiKey(false)
    setTestResult(null)
  }, [data])

  const updateField = (field: keyof TtsConfigFields, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }))
  }

  /**
   * 由表单当前值构造请求体 —— 保存与「测试调用」共用同一份。
   *
   * 2026-10：两处必须发**完全相同**的内容。原先 testTts() 不带参、后端拿
   * 已保存配置去测，运营填错的 base_url 也能测出绿灯。若两处各自拼 payload，
   * 迟早会漂移成"测的和存的不是一个东西"——那正是这个 bug 的本质。
   */
  const buildPayload = (): Parameters<typeof updateTtsConfig>[0] => {
    const payload: Parameters<typeof updateTtsConfig>[0] = { provider }
    if (provider === 'edge') {
      payload.edge_voice = fields.edgeVoice.trim() || null
    } else if (provider === 'openai') {
      if (fields.openaiApiKey) payload.openai_api_key = fields.openaiApiKey
      payload.openai_base_url = fields.openaiBaseUrl.trim() || null
      payload.openai_model = fields.openaiModel.trim() || null
      payload.openai_voice = fields.openaiVoice.trim() || null
    } else if (provider === 'doubao') {
      if (fields.doubaoApiKey) payload.doubao_api_key = fields.doubaoApiKey
      if (fields.doubaoToken) payload.doubao_token = fields.doubaoToken
      payload.doubao_app_id = fields.doubaoAppId.trim() || null
      payload.doubao_voice = fields.doubaoVoice.trim() || null
      payload.doubao_resource_id = fields.doubaoResourceId.trim() || null
    } else if (provider === 'local') {
      payload.local_voice = fields.localVoice.trim() || null
      payload.ffmpeg_bin = fields.ffmpegBin.trim() || null
    } else if (provider === 'indextts') {
      payload.indextts_base_url = fields.indexttsBaseUrl.trim() || null
      payload.indextts_model = fields.indexttsModel.trim() || null
      payload.indextts_ref_audio = fields.indexttsRefAudio.trim() || null
      payload.indextts_ref_text = fields.indexttsRefText.trim() || null
    }
    return payload
  }

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = buildPayload()
      await updateTtsConfig(payload)
      toast('保存成功', 'success')
      // 清空 key 输入
      setFields((prev) => ({
        ...prev,
        openaiApiKey: '',
        doubaoApiKey: '',
        doubaoToken: '',
        doubaoAppId: '',
      }))
      setTestResult(null)
      reload()
    } catch (err) {
      console.warn('[CP TTS-Config] updateTtsConfig failed:', toErrorMessage(err))
      toast(`保存失败：${toErrorMessage(err)}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // 用 buildPayload() —— 与保存发同一份内容。原先 testTts() 不带参，
      // 后端拿已保存配置去测，表单里刚填的错值能测出绿灯（2026-10 修）。
      const result = await testTts(buildPayload())
      setTestResult(result)
      // 音色名填错是最常见的配置错误，而服务的报错里就带着可用列表。
      // 后端把它结构化放在 supported_voices —— 这里直接显示成候选，
      // 运营点一下就填进输入框，不用翻日志也不用一个个试。
      if (result.supported_voices?.length) {
        setSupportedVoices(result.supported_voices)
        setVoiceProbeHint(null)
      }
      // CP-TTS-TEST-ERR：按 error_kind 给具体引导 toast（不再只说"失败"两字）
      const t = toastForTtsTestResult(result)
      toast(t.message, t.kind)
    } catch (err) {
      // 网络层错误（4xx/5xx/无 response 等）；按业务上下文给准确描述
      console.warn('[CP TTS-Config] testTts failed:', toErrorMessage(err, 'TTS 服务（OpenAI 协议 / 豆包 / edge-tts / IndexTTS）'))
      toast(`测试调用失败：${toErrorMessage(err, 'TTS 服务（OpenAI 协议 / 豆包 / edge-tts / IndexTTS）')}`, 'error')
    } finally {
      setTesting(false)
    }
  }

  /**
   * 探测该模型支持哪些音色（2026-10-21）。
   *
   * 用**表单当前值**去探（和 buildPayload 同一份）—— 否则探的是已存配置，
   * 运营改完 base_url 再探，探的还是旧地址，等于白探。
   */
  const handleProbeVoices = async () => {
    setProbing(true)
    try {
      const result = await probeTtsVoices(buildPayload())
      setSupportedVoices(result.supported_voices ?? [])
      setVoiceProbeHint(result.hint ?? null)
      if (result.supported_voices?.length) {
        toast(`探测到 ${result.supported_voices.length} 个可用音色`, 'success')
      } else {
        // 探不出来**不是错误**（可能那个服务根本不校验 voice），
        // 用 info 而不是 error —— 红色 toast 会让人以为配置坏了。
        toast(result.hint ?? '没能探测到音色列表', 'info')
      }
    } catch (err) {
      console.warn('[CP TTS-Config] probeTtsVoices failed:', toErrorMessage(err))
      setSupportedVoices([])
      setVoiceProbeHint(null)
      toast(`探测失败：${toErrorMessage(err)}`, 'error')
    } finally {
      setProbing(false)
    }
  }

  return (
    <div>
      <div>
        <h1 className={pageTitleClass}>TTS 配置</h1>
        <p className={pageHintClass}>
          决定音频用什么引擎合成。保存后立即生效，不需要重启服务
        </p>
      </div>

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      <CurrentConfigCard data={data} loading={loading} />

      <TtsConfigForm
        provider={provider}
        data={fields}
        apiKeySet={data?.api_key_set ?? false}
        showApiKey={showApiKey}
        saving={saving}
        testing={testing}
        onProviderChange={setProvider}
        onFieldChange={updateField}
        onToggleApiKey={() => setShowApiKey((v) => !v)}
        onSubmit={handleSave}
        onTest={handleTest}
        onProbeVoices={handleProbeVoices}
        probing={probing}
        supportedVoices={supportedVoices}
        voiceProbeHint={voiceProbeHint}
      />

      <TtsTestPanel result={testResult} />
    </div>
  )
}

export default TtsSettings