import { useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
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

const PROVIDERS = ['mock', 'openai', 'qwen_vl'] as const

const MODEL_PLACEHOLDER: Record<string, string> = {
  mock: 'mock（任意字符串，不真调用）',
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

export function LlmSettings() {
  const { data, loading, error, missing, reload } = useApi(getLlmConfig, 'llm-config')

  const [provider, setProvider] = useState('mock')
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
    setProvider(data.provider || 'mock')
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
      toast(result.ok ? '测试调用成功' : '测试调用失败', result.ok ? 'success' : 'error')
    } catch (err) {
      console.warn('[CP7.3] testLlm failed:', toErrorMessage(err))
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
        <h1 className={pageTitleClass}>LLM 配置</h1>
        <p className={pageHintClass}>
          admin 可改服务商 / 模型 / API key —— 数据源：GET /api/v1/admin/llm/config
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
                    <th className={`${cellMutedClass} font-normal`}>Model</th>
                    <td className={cellTextClass}>{testResult.model || '—'}</td>
                  </tr>
                  <tr className={rowClass}>
                    <th className={`${cellMutedClass} font-normal`}>
                      {testResult.ok ? '返回文本' : '错误'}
                    </th>
                    <td className={`${cellTextClass} whitespace-pre-wrap break-all`}>
                      {testResult.ok ? testResult.text : testResult.error}
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

export default LlmSettings
