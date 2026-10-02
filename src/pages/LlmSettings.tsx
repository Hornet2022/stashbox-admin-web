import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { getLlmConfig, testLlm, updateLlmConfig } from '../api/admin'
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
import type { LlmTestResult } from '../types'

/**
 * LLM 配置页（CP7.3）—— GET/PUT /api/v1/admin/llm/config + GET /admin/llm/test。
 */

const PROVIDERS = ['openai', 'qwen_vl'] as const

const MODEL_PLACEHOLDER: Record<string, string> = {
  openai: '如 gpt-4o-mini / gpt-4o',
  qwen_vl: '如 qwen3.6-flash',
}

/** 卡片容器 —— 复用表格卡片的边框/圆角观感 */
const cardClass = `${tableWrapClass} mt-6`
const cardBodyClass = 'px-4 py-4'

/** 配置展示用的 dt/dd 排版（表格 cell 类去掉 px-4 py-3 内边距） */
const dtClass = 'text-sm text-neutral-400 dark:text-neutral-500'
const ddClass = 'text-sm text-neutral-600 dark:text-neutral-300'
const ddStrongClass = 'text-sm font-medium text-ink dark:text-neutral-100'

/**
 * CP-LLM-TEST-ERR：错误分类 → 视觉色调
 *
 * 后端 /admin/llm/test 已经把异常归到 error_kind，前端只用它决定颜色/图标，
 * 文案优先用后端下发的 hint（保持单一真源）；没有 hint 时才用前端兜底。
 *
 * 调色规则（与 TtsTestPanel 已有的 Badge 风格对齐，不引入新色板）：
 *   - 鉴权类（auth/forbidden/notfound/badreq）  → 红
 *   - 限流类（ratelimit）                       → 橙
 *   - 网络类（timeout/connect/network）          → 蓝
 *   - 内部类（internal）                        → 中性灰
 */
const ERROR_KIND_TONE: Record<string, { badge: string; banner: string; label: string }> = {
  auth: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200', banner: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/20 dark:text-rose-100 dark:border-rose-800', label: '鉴权失败' },
  forbidden: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200', banner: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/20 dark:text-rose-100 dark:border-rose-800', label: '权限受限' },
  notfound: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200', banner: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/20 dark:text-rose-100 dark:border-rose-800', label: '资源不存在' },
  badreq: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200', banner: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/20 dark:text-rose-100 dark:border-rose-800', label: '参数错误' },
  ratelimit: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', banner: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800', label: '触发限流' },
  timeout: { badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', banner: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-900/20 dark:text-sky-100 dark:border-sky-800', label: '调用超时' },
  connect: { badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', banner: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-900/20 dark:text-sky-100 dark:border-sky-800', label: '无法连接' },
  network: { badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', banner: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-900/20 dark:text-sky-100 dark:border-sky-800', label: '网络异常' },
  internal: { badge: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200', banner: 'bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700', label: '内部异常' },
}

/** 前端兜底文案（后端 hint 缺失时用，比如部署了老版本后端） */
const ERROR_KIND_FALLBACK_HINT: Record<string, string> = {
  auth: 'API key 无效或已过期，请检查后重新保存配置',
  forbidden: '账号被限制使用该模型（可能欠费、无模型权限或区域受限），请到供应商后台核查',
  notfound: '模型不存在或 Base URL 路径错误，请核对「模型名」和「Base URL」',
  badreq: '请求参数不合法，请检查配置',
  ratelimit: '请求过于频繁，请稍后再试',
  timeout: '第三方服务未在 timeout 内响应，请稍后重试',
  connect: '无法连接到 LLM 服务端，请检查 Base URL 是否可访问',
  network: '网络传输异常，请检查网络环境或代理设置',
  internal: '服务端处理异常（响应格式非预期），请联系开发排查',
}

/**
 * toast 文案：成功 / 失败 各分类一句。让用户一眼看出**下一步干啥**，
 * 而不是只看到「失败」两字。
 */
function toastForTestResult(result: LlmTestResult): { message: string; kind: 'success' | 'error' | 'info' } {
  if (result.ok) {
    const preview = (result.text ?? '').replace(/\s+/g, ' ').slice(0, 60)
    return {
      message: preview ? `测试调用成功：${preview}` : '测试调用成功',
      kind: 'success',
    }
  }
  const k = result.error_kind ?? ''
  const hint = result.hint ?? ERROR_KIND_FALLBACK_HINT[k] ?? `测试调用失败（${result.error ?? '未知错误'}）`
  return { message: hint, kind: 'error' }
}

export function LlmSettings() {
  const { data, loading, error, missing, reload } = useApi(getLlmConfig, 'llm-config')

  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<LlmTestResult | null>(null)

  /** 服务端配置落地后同步进表单（刷新页面也要看到 DB 里的值） */
  useEffect(() => {
    if (!data) return
    setProvider(data.provider || 'openai')
    setModel(data.model ?? '')
    setBaseUrl(data.base_url ?? '')
    setApiKey('')
    setShowApiKey(false)
  }, [data])

  const canSave = !saving && model.trim().length > 0

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSave) return

    setSaving(true)
    try {
      await updateLlmConfig({
        provider,
        model: model.trim(),
        ...(apiKey ? { api_key: apiKey } : {}),
        ...(provider === 'openai' && baseUrl.trim() ? { base_url: baseUrl.trim() } : {}),
        ...(provider === 'qwen_vl' && baseUrl.trim() ? { base_url: baseUrl.trim() } : {}),
      })
      toast('保存成功', 'success')
      setApiKey('')
      setTestResult(null)
      reload()
    } catch (err) {
      console.warn('[CP7.3] updateLlmConfig failed:', toErrorMessage(err))
      toast(`保存失败：${toErrorMessage(err)}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testLlm()
      setTestResult(result)
      const t = toastForTestResult(result)
      toast(t.message, t.kind)
    } catch (err) {
      // 网络层错误（4xx/5xx/无 response 等）；按业务上下文给准确描述，避免和 TTS 串台
      console.warn('[CP7.3] testLlm failed:', toErrorMessage(err, 'OpenAI 兼容端点（OpenAI / 火山方舟 / qwen_vl）'))
      toast(`测试调用失败：${toErrorMessage(err, 'OpenAI 兼容端点（OpenAI / 火山方舟 / qwen_vl）')}`, 'error')
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
        <h1 className={pageTitleClass}>LLM 配置</h1>
        <p className={pageHintClass}>
          决定改写文本用哪个模型。保存后立即生效，不需要重启服务
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
              <dd className={ddStrongClass}>{data ? <Badge value={data.provider} /> : '—'}</dd>

              <dt className={dtClass}>Model</dt>
              <dd className={ddClass}>{data?.model || '—'}</dd>

              <dt className={dtClass}>API key</dt>
              <dd className={ddClass}>{data ? apiKeyStatus : '—'}</dd>

              <dt className={dtClass}>Base URL</dt>
              <dd className={ddClass}>{data?.base_url || '—'}</dd>

              <dt className={dtClass}>上次更新</dt>
              <dd className={dtClass}>{data?.updated_at ? formatTime(data.updated_at) : '—'}</dd>

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
                onChange={(e) => setProvider(e.target.value)}
                className={inputClass}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Model">
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={MODEL_PLACEHOLDER[provider] ?? ''}
                className={`t-input ${inputClass}`}
              />
            </Field>

            <Field label="API key（留空表示不改动）">
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
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

            {provider === 'openai' && (
              <Field label="Base URL（留空用 OpenAI 默认）">
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className={`t-input ${inputClass}`}
                />
              </Field>
            )}

            {provider === 'qwen_vl' && (
              <Field label="Base URL（Token Plan 团队版）">
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1"
                  className={`t-input ${inputClass}`}
                />
              </Field>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button type="submit" className={buttonPrimaryClass} disabled={!canSave}>
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
              {!model.trim() && (
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  Model 必填
                </span>
              )}
            </div>
          </form>

          {testResult && (
            <div className="mt-6 space-y-3">
              {/* 失败时用醒目 banner 给出可执行引导（CP-LLM-TEST-ERR） */}
              {!testResult.ok && testResult.hint && (
                <div
                  role="alert"
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                    ERROR_KIND_TONE[testResult.error_kind ?? 'internal']?.banner ??
                    ERROR_KIND_TONE.internal.banner
                  }`}
                >
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="font-medium">
                      {ERROR_KIND_TONE[testResult.error_kind ?? 'internal']?.label ?? '调用失败'}
                      {testResult.status_code != null && (
                        <span className="ml-2 text-xs opacity-80">HTTP {testResult.status_code}</span>
                      )}
                    </div>
                    <div className="mt-0.5">{testResult.hint}</div>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700">
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
                      <th className={`${cellMutedClass} font-normal`}>Model</th>
                      <td className={cellTextClass}>{testResult.model || '—'}</td>
                    </tr>
                    {testResult.ok ? (
                      <tr className={rowClass}>
                        <th className={`${cellMutedClass} font-normal`}>返回文本</th>
                        <td className={`${cellTextClass} whitespace-pre-wrap break-all`}>
                          {testResult.text || '（空响应）'}
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr className={rowClass}>
                          <th className={`${cellMutedClass} font-normal`}>错误分类</th>
                          <td className={cellTextClass}>
                            {testResult.error_kind ? (
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                                  ERROR_KIND_TONE[testResult.error_kind]?.badge ??
                                  ERROR_KIND_TONE.internal.badge
                                }`}
                              >
                                {ERROR_KIND_TONE[testResult.error_kind]?.label ?? testResult.error_kind}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                        <tr className={rowClass}>
                          <th className={`${cellMutedClass} font-normal`}>状态码</th>
                          <td className={cellTextClass}>
                            {testResult.status_code != null ? testResult.status_code : '—'}
                          </td>
                        </tr>
                        <tr className={rowClass}>
                          <th className={`${cellMutedClass} font-normal`}>原始异常</th>
                          <td className={`${cellTextClass} whitespace-pre-wrap break-all text-xs opacity-80`}>
                            {testResult.detail || testResult.error || '—'}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default LlmSettings
