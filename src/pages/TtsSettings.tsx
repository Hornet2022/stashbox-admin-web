/**
 * TTS 配置页（CP TTS-Config）—— GET/PUT /api/v1/admin/tts/config + /test。
 *
 * 5 个 provider：edge / openai / doubao / local / indextts。
 * （mock provider 仅后端单测/CI 用，不在管理后台暴露）
 * 各 provider 字段差异较大，用 conditional 渲染分组显示。
 * 改完点保存 → 后端落 system_config + 立即 reload factory（热生效，不用重启 ai-service）。
 */

import { useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { getTtsConfig, testTts, updateTtsConfig } from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import { toast } from '../store/toast'
import {
  Badge,
  ErrorNotice,
  Field,
  Skeleton,
  buttonGhostClass,
  buttonPrimaryClass,
  cellMutedClass,
  cellStrongClass,
  cellTextClass,
  inputClass,
  pageHintClass,
  pageTitleClass,
  rowClass,
  tableWrapClass,
} from '../components/ui'
import { formatTime } from '../utils'
import type { TtsTestResult } from '../types'

const PROVIDERS = ['edge', 'openai', 'doubao', 'local', 'indextts'] as const
type TtsProvider = (typeof PROVIDERS)[number]

/** provider 简短说明 —— 卡片顶部 hint 用 */
const PROVIDER_HINT: Record<TtsProvider, string> = {
  edge: '微软 Edge TTS（免费，需 pip install edge-tts）',
  openai: 'OpenAI 兼容协议（火山方舟/OpenAI/Azure 都用这一组）',
  doubao: '火山引擎豆包 TTS（Coding Plan HTTP POST）',
  local: 'macOS say + ffmpeg（零凭证、纯本地，仅 macOS）',
  indextts: 'IndexTTS-1.5 零样本克隆（oMLX /v1/audio/speech，macmini 本地 GPU）',
}

const cardClass = `${tableWrapClass} mt-6`
const cardBodyClass = 'px-4 py-4'
const dtClass = 'text-sm text-neutral-400 dark:text-neutral-500'
const ddClass = 'text-sm text-neutral-600 dark:text-neutral-300'
const ddStrongClass = 'text-sm font-medium text-ink dark:text-neutral-100'

export function TtsSettings() {
  const { data, loading, error, missing, reload } = useApi(getTtsConfig, 'tts-config')

  const [provider, setProvider] = useState<TtsProvider>('indextts')

  // edge
  const [edgeVoice, setEdgeVoice] = useState('')
  // openai
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('')
  const [openaiModel, setOpenaiModel] = useState('tts-1')
  const [openaiVoice, setOpenaiVoice] = useState('alloy')
  // doubao
  const [doubaoApiKey, setDoubaoApiKey] = useState('')
  const [doubaoToken, setDoubaoToken] = useState('')
  const [doubaoAppId, setDoubaoAppId] = useState('')
  const [doubaoVoice, setDoubaoVoice] = useState('BV001_streaming')
  const [doubaoResourceId, setDoubaoResourceId] = useState('seed-tts-2.0')
  // local
  const [localVoice, setLocalVoice] = useState('Tingting')
  const [ffmpegBin, setFfmpegBin] = useState('/opt/homebrew/bin/ffmpeg')
  // indextts（oMLX + ref_audio 零样本克隆）
  const [indexttsBaseUrl, setIndexttsBaseUrl] = useState('http://127.0.0.1:8008/v1')
  const [indexttsModel, setIndexttsModel] = useState('IndexTTS-1.5')
  const [indexttsRefAudio, setIndexttsRefAudio] = useState('')
  const [indexttsRefText, setIndexttsRefText] = useState('')

  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TtsTestResult | null>(null)

  /** 把后端 GET 拿到的 DB 配置同步进表单 */
  useEffect(() => {
    if (!data) return
    setProvider((data.provider as TtsProvider) || 'indextts')
    setEdgeVoice(data.edge_voice ?? 'zh-CN-XiaoxiaoNeural')
    setOpenaiBaseUrl(data.openai_base_url ?? 'https://api.openai.com/v1')
    setOpenaiModel(data.openai_model ?? 'tts-1')
    setOpenaiVoice(data.openai_voice ?? 'alloy')
    setDoubaoVoice(data.doubao_voice ?? 'BV001_streaming')
    setDoubaoResourceId(data.doubao_resource_id ?? 'seed-tts-2.0')
    setLocalVoice(data.local_voice ?? 'Tingting')
    setFfmpegBin(data.ffmpeg_bin ?? '/opt/homebrew/bin/ffmpeg')
    setIndexttsBaseUrl(data.indextts_base_url ?? 'http://127.0.0.1:8008/v1')
    setIndexttsModel(data.indextts_model ?? 'IndexTTS-1.5')
    setIndexttsRefAudio(data.indextts_ref_audio ?? '')
    setIndexttsRefText(data.indextts_ref_text ?? '')
    // 各种 key 留空（"留空不改动"语义）
    setOpenaiApiKey('')
    setDoubaoApiKey('')
    setDoubaoToken('')
    setDoubaoAppId('')
    setShowApiKey(false)
  }, [data])

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Parameters<typeof updateTtsConfig>[0] = { provider }
      if (provider === 'edge') {
        payload.edge_voice = edgeVoice.trim() || null
      } else if (provider === 'openai') {
        if (openaiApiKey) payload.openai_api_key = openaiApiKey
        payload.openai_base_url = openaiBaseUrl.trim() || null
        payload.openai_model = openaiModel.trim() || null
        payload.openai_voice = openaiVoice.trim() || null
      } else if (provider === 'doubao') {
        if (doubaoApiKey) payload.doubao_api_key = doubaoApiKey
        if (doubaoToken) payload.doubao_token = doubaoToken
        payload.doubao_app_id = doubaoAppId.trim() || null
        payload.doubao_voice = doubaoVoice.trim() || null
        payload.doubao_resource_id = doubaoResourceId.trim() || null
      } else if (provider === 'local') {
        payload.local_voice = localVoice.trim() || null
        payload.ffmpeg_bin = ffmpegBin.trim() || null
      } else if (provider === 'indextts') {
        payload.indextts_base_url = indexttsBaseUrl.trim() || null
        payload.indextts_model = indexttsModel.trim() || null
        payload.indextts_ref_audio = indexttsRefAudio.trim() || null
        payload.indextts_ref_text = indexttsRefText.trim() || null
      }
      await updateTtsConfig(payload)
      toast('保存成功', 'success')
      setOpenaiApiKey('')
      setDoubaoApiKey('')
      setDoubaoToken('')
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
      toast(result.ok ? '测试调用成功' : '测试调用失败', result.ok ? 'success' : 'error')
    } catch (err) {
      console.warn('[CP TTS-Config] testTts failed:', toErrorMessage(err))
      toast(`测试调用失败：${toErrorMessage(err)}`, 'error')
    } finally {
      setTesting(false)
    }
  }

  const apiKeyStatus = data?.api_key_set
    ? `已设置（末 4 位 ${data.api_key_last4 ?? '????'}）`
    : '未设置'

  return (
    <div>
      <div>
        <h1 className={pageTitleClass}>TTS 配置</h1>
        <p className={pageHintClass}>
          admin 可改语音合成服务商 / 音色 / API key —— 数据源：
          GET /api/v1/admin/tts/config，保存后立即热生效，不用重启 ai-service
        </p>
      </div>

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      {/* 卡片 1：当前配置 */}
      <section className={cardClass}>
        <header className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-700/60">
          <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
            当前配置
          </h2>
        </header>
        <div className={cardBodyClass}>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[8rem_1fr]">
              <dt className={dtClass}>Provider</dt>
              <dd className={ddStrongClass}>
                {data ? <Badge value={data.provider} /> : '—'}
              </dd>

              <dt className={dtClass}>Voice</dt>
              <dd className={ddClass}>
                {data ? (
                  // 简洁地展示当前 provider 对应音色字段
                  (data.provider === 'edge' && data.edge_voice) ||
                  (data.provider === 'openai' && data.openai_voice) ||
                  (data.provider === 'doubao' && data.doubao_voice) ||
                  (data.provider === 'local' && data.local_voice) ||
                  (data.provider === 'indextts' &&
                    data.indextts_ref_audio?.split('/').pop()) ||
                  '—'
                ) : (
                  '—'
                )}
              </dd>

              <dt className={dtClass}>API key</dt>
              <dd className={ddClass}>{data ? apiKeyStatus : '—'}</dd>

              {data?.provider === 'local' && (
                <>
                  <dt className={dtClass}>ffmpeg</dt>
                  <dd className={ddClass}>{data.ffmpeg_bin || '—'}</dd>
                </>
              )}

              {data?.provider === 'doubao' && data.doubao_resource_id && (
                <>
                  <dt className={dtClass}>Resource ID</dt>
                  <dd className={ddClass}>{data.doubao_resource_id}</dd>
                </>
              )}

              <dt className={dtClass}>上次更新</dt>
              <dd className={dtClass}>
                {data?.updated_at ? formatTime(data.updated_at) : '—'}
              </dd>

              <dt className={dtClass}>来源</dt>
              <dd className={ddClass}>{data?.source ? <Badge value={data.source} /> : '—'}</dd>
            </dl>
          )}
        </div>
      </section>

      {/* 卡片 2：编辑表单 */}
      <section className={cardClass}>
        <header className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-700/60">
          <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
            修改配置
          </h2>
        </header>
        <div className={cardBodyClass}>
          <form className="max-w-xl space-y-4" onSubmit={handleSave}>
            <Field label="Provider">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as TtsProvider)}
                className={inputClass}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                {PROVIDER_HINT[provider]}
              </p>
            </Field>

            {/* —— edge —— */}
            {provider === 'edge' && (
              <Field label="Voice（Edge TTS 音色 ID）">
                <input
                  type="text"
                  value={edgeVoice}
                  onChange={(e) => setEdgeVoice(e.target.value)}
                  placeholder="zh-CN-XiaoxiaoNeural"
                  className={`t-input ${inputClass}`}
                />
              </Field>
            )}

            {/* —— openai 协议（火山方舟/OpenAI/Azure）—— */}
            {provider === 'openai' && (
              <>
                <Field label="API key（留空表示不改动已存的那把）">
                  <div className="flex gap-2">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder={data?.api_key_set ? '已保存，留空则不变' : 'sk-...'}
                      autoComplete="new-password"
                      className={`t-input ${inputClass}`}
                    />
                    <button
                      type="button"
                      className={buttonGhostClass}
                      onClick={() => setShowApiKey((v) => !v)}
                      aria-label={showApiKey ? '隐藏 API key' : '显示 API key'}
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
                <Field label="Base URL">
                  <input
                    type="text"
                    value={openaiBaseUrl}
                    onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1（火山方舟填 https://ark.cn-beijing.volces.com/api/v3）"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
                <Field label="Model">
                  <input
                    type="text"
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    placeholder="tts-1"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
                <Field label="Voice">
                  <input
                    type="text"
                    value={openaiVoice}
                    onChange={(e) => setOpenaiVoice(e.target.value)}
                    placeholder="alloy"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
              </>
            )}

            {/* —— doubao —— */}
            {provider === 'doubao' && (
              <>
                <Field label="API key（Coding Plan 专属）">
                  <div className="flex gap-2">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={doubaoApiKey}
                      onChange={(e) => setDoubaoApiKey(e.target.value)}
                      placeholder={data?.api_key_set ? '已保存，留空则不变' : '从火山方舟控制台获取'}
                      autoComplete="new-password"
                      className={`t-input ${inputClass}`}
                    />
                    <button
                      type="button"
                      className={buttonGhostClass}
                      onClick={() => setShowApiKey((v) => !v)}
                      aria-label={showApiKey ? '隐藏 API key' : '显示 API key'}
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
                <Field label="Token（旧版兼容，可留空）">
                  <input
                    type="password"
                    value={doubaoToken}
                    onChange={(e) => setDoubaoToken(e.target.value)}
                    placeholder="旧版 TOKEN，留空表示不改动"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
                <Field label="App ID（旧版兼容，可留空）">
                  <input
                    type="text"
                    value={doubaoAppId}
                    onChange={(e) => setDoubaoAppId(e.target.value)}
                    placeholder="留空表示不改动"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
                <Field label="Voice（音色 ID）">
                  <input
                    type="text"
                    value={doubaoVoice}
                    onChange={(e) => setDoubaoVoice(e.target.value)}
                    placeholder="BV001_streaming"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
                <Field label="Resource ID">
                  <input
                    type="text"
                    value={doubaoResourceId}
                    onChange={(e) => setDoubaoResourceId(e.target.value)}
                    placeholder="seed-tts-2.0"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
              </>
            )}

            {/* —— local —— */}
            {provider === 'local' && (
              <>
                <Field label="Voice（macOS 中文嗓音）">
                  <input
                    type="text"
                    value={localVoice}
                    onChange={(e) => setLocalVoice(e.target.value)}
                    placeholder="Tingting（可换：Eddy/Flo/Reed/Rocko/Sandy）"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
                <Field label="ffmpeg 路径">
                  <input
                    type="text"
                    value={ffmpegBin}
                    onChange={(e) => setFfmpegBin(e.target.value)}
                    placeholder="/opt/homebrew/bin/ffmpeg"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
              </>
            )}

            {/* —— indextts —— */}
            {provider === 'indextts' && (
              <>
                <Field label="服务地址（oMLX OpenAI 兼容 base）">
                  <input
                    type="text"
                    value={indexttsBaseUrl}
                    onChange={(e) => setIndexttsBaseUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8008/v1"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
                <Field label="模型名">
                  <input
                    type="text"
                    value={indexttsModel}
                    onChange={(e) => setIndexttsModel(e.target.value)}
                    placeholder="IndexTTS-1.5"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
                <Field label="参考音频（服务端 wav 绝对路径，音色来源）">
                  <input
                    type="text"
                    value={indexttsRefAudio}
                    onChange={(e) => setIndexttsRefAudio(e.target.value)}
                    placeholder="/Users/hornet/work/stashbox/backend/data/voices/tingting_ref.wav"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
                <Field label="参考音频转录文本（必须与音频内容一致）">
                  <input
                    type="text"
                    value={indexttsRefText}
                    onChange={(e) => setIndexttsRefText(e.target.value)}
                    placeholder="今天天气不错，我们一起来看看这条新闻讲了什么内容。"
                    className={`t-input ${inputClass}`}
                  />
                </Field>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  IndexTTS 是零样本音色克隆：音色由参考音频决定（Voice 字段无效）。
                  参考音频建议 3–10 秒、安静环境、16kHz 单声道 wav。
                </p>
              </>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button type="submit" className={buttonPrimaryClass} disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
              <button
                type="button"
                className={buttonGhostClass}
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? '调用中…' : '测试调用'}
              </button>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                修改后立即热生效，下一次蒸馏任务直接用新 provider
              </span>
            </div>
          </form>

          {testResult && (
            <div className="mt-6 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700">
              <table className="w-full text-left text-sm">
                <tbody>
                  <tr className={rowClass}>
                    <th className={`${cellMutedClass} font-normal`}>结果</th>
                    <td className={cellStrongClass}>
                      <Badge value={testResult.ok ? 'ok' : 'failed'} />
                    </td>
                  </tr>
                  <tr className={rowClass}>
                    <th className={`${cellMutedClass} font-normal`}>Provider</th>
                    <td className={cellTextClass}>{testResult.provider}</td>
                  </tr>
                  <tr className={rowClass}>
                    <th className={`${cellMutedClass} font-normal`}>Voice</th>
                    <td className={cellTextClass}>{testResult.voice || '—'}</td>
                  </tr>
                  <tr className={rowClass}>
                    <th className={`${cellMutedClass} font-normal`}>
                      {testResult.ok ? '合成字节数' : '错误'}
                    </th>
                    <td className={`${cellTextClass} whitespace-pre-wrap break-all`}>
                      {testResult.ok
                        ? `${testResult.bytes_len ?? 0} bytes`
                        : testResult.error}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default TtsSettings