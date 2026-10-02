import { useEffect, useState, type FormEvent } from 'react'
import { getTtsConfig, testTts, updateTtsConfig } from '../api/admin'
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

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
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
      const result = await testTts()
      setTestResult(result)
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
      />

      <TtsTestPanel result={testResult} />
    </div>
  )
}

export default TtsSettings