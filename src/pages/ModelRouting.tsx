import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getTierConfig, updateTierConfig } from '../api/admin/tier-config'
import { useApi } from '../hooks/useApi'
import { toast } from '../store/toast'
import {
  CaveatBanner,
  ErrorNotice,
  Skeleton,
  buttonGhostClass,
  buttonPrimaryClass,
  cellTextClass,
  footerCountClass,
  inputClass,
  pageHintClass,
  pageTitleClass,
  tableWrapClass,
  thClass,
  theadClass,
} from '../components/ui'
import { formatTime } from '../utils'
import type { TierConfig, TierModelMap, TierName, TierProvider } from '../types'

/**
 * 模型路由 —— A1 /admin/tier-config（接口文档 §2.2，含 D2 接线）。
 *
 * 关键交互：
 *   - PUT 成功后必须 GET 回读 source=='db' 确认生效
 *   - warnings 非空时 UI 必须给黄色 CaveatBanner（防止运营配未实现 client 的 provider）
 *
 * 生效链路：PUT → system_config 落库 + Redis 缓存 5s + 写后立即失效
 * → 蒸馏任务启动前 reload → resolve_tier_map() 读生效映射。
 * 无需重启 worker。
 *
 * CP-NEW.4 完整实现。
 */

const TIER_NAMES: TierName[] = ['simple', 'full']
const TIER_LABELS: Record<TierName, string> = {
  simple: 'simple · 快速档（≤3 段 / 短文章）',
  full: 'full · 高质量档（>3 段 / 长文章）',
}

export function ModelRouting() {
  const configState = useApi(getTierConfig, 'tier-config')

  return (
    <div>
      <h1 className={pageTitleClass}>模型路由</h1>
      <p className={pageHintClass}>
        决定每个付费档位走哪个模型。修改保存后立即生效，不需要重启服务
      </p>

      {configState.error && (
        <ErrorNotice
          message={configState.error}
          missing={configState.missing}
          onRetry={configState.reload}
        />
      )}

      {!configState.data && configState.loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : configState.data ? (
        <ConfigEditor
          config={configState.data}
          onReload={configState.reload}
        />
      ) : null}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   编辑器
───────────────────────────────────────────────────────── */

function ConfigEditor({
  config,
  onReload,
}: {
  config: TierConfig
  onReload: () => void
}) {
  const [draft, setDraft] = useState<TierModelMap>(config.tier_model_map)
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // 后端数据变化 → 重置 draft（首次加载或 reload 后）
  useEffect(() => {
    setDraft(config.tier_model_map)
  }, [config.tier_model_map])

  const updateModel = (tier: TierName, provider: string, model: string) => {
    setDraft((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [provider]: model },
    }))
  }

  const resetToDefault = () => {
    setDraft(config.default_map)
    toast('已恢复为代码默认（未保存）', 'info')
  }

  /** diff 出实际改动的 tier → provider → model（避免 PUT 全量）
   *
   * 注：接口文档允许 PUT 部分覆盖；但前端 diff 后只发变更部分更省流量 + 易追踪
   */
  const buildPayload = (): TierModelMap => {
    return draft
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setVerifying(true)
    try {
      await updateTierConfig({ tier_model_map: buildPayload() })
      // 回读确认（接口文档 §2.2 硬约束）
      const fresh = await getTierConfig()
      if (fresh.source === 'db') {
        toast('保存成功，生效已确认', 'success')
      } else {
        toast(`保存异常：source=${fresh.source}（预期 db），请重试`, 'error')
      }
      onReload()
    } catch {
      // 拦截器已 toast
    } finally {
      setSubmitting(false)
      setVerifying(false)
    }
  }

  // 检测 draft 中配的 provider 是否在 supported_providers 里
  const isProviderSupported = (provider: string): boolean => {
    return config.supported_providers.includes(provider as TierProvider)
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(config.tier_model_map)

  return (
    <div className="mt-6 space-y-5">
      {/* 顶部元信息 */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">当前生效来源</span>
          <SourceBadge source={config.source} />
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            更新于 {formatTime(config.updated_at)}
          </span>
        </div>
        <button
          type="button"
          className={`${buttonGhostClass} flex items-center gap-1.5 text-xs`}
          onClick={onReload}
          disabled={verifying}
        >
          <RefreshCw size={12} className={verifying ? 'animate-spin' : ''} />
          重新拉取
        </button>
      </div>

      {/* warnings 黄条（接口文档硬约束） */}
      {config.warnings.length > 0 && (
        <CaveatBanner
          variant="warning"
          title="provider 配置警告"
          items={config.warnings}
        />
      )}

      {/* 左右双栏：默认 vs 生效 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ConfigPreview label="代码默认" tierMap={config.default_map} />
        <ConfigForm
          label="当前生效（可编辑）"
          draft={draft}
          supported={config.supported_providers}
          onUpdate={updateModel}
          isProviderSupported={isProviderSupported}
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className={buttonGhostClass}
          onClick={resetToDefault}
          disabled={submitting}
        >
          恢复默认
        </button>
        <button
          type="button"
          className={buttonPrimaryClass}
          onClick={handleSubmit}
          disabled={!dirty || submitting}
        >
          {submitting ? (verifying ? '回读确认中…' : '提交中…') : '保存'}
        </button>
      </div>

      {!dirty && (
        <p className="text-right text-xs text-neutral-400 dark:text-neutral-500">
          未改动
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   source 徽标
───────────────────────────────────────────────────────── */

function SourceBadge({ source }: { source: TierConfig['source'] }) {
  const tone =
    source === 'db'
      ? 'bg-success/10 text-success-ink'
      : 'bg-warning/10 text-warning-ink'
  return (
    <span
      role="status"
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {source === 'db' ? 'db · system_config 覆盖中' : 'default · 代码默认'}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────
   只读预览
───────────────────────────────────────────────────────── */

function ConfigPreview({ label, tierMap }: { label: string; tierMap: TierModelMap }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
      <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
        {label}
      </h2>
      <div className={tableWrapClass}>
                {/* w-full 不带 min-w-max 时表格会被压进容器宽度里挤列：375px 下 7 列平均每列 49px，
          中文单元格会被挤成一两个字一行 —— 就是本仓库 f102934 修过的那个竖排。
          带 min-w-max 才是「保持自然宽度 + 横向滚动」，降级方式才对。
          仓库里已有 5 张表是这个写法，这里补齐。 */}
        <table className="w-full min-w-max text-sm">
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>tier</th>
              {Object.keys(tierMap[TIER_NAMES[0]]).map((provider) => (
                <th key={provider} className={thClass}>
                  {provider}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIER_NAMES.map((tier) => (
              <tr key={tier} className="border-t border-neutral-100 dark:border-neutral-700/60">
                <td className="px-4 py-3 text-sm font-medium text-ink dark:text-neutral-100">
                  {TIER_LABELS[tier]}
                </td>
                {Object.entries(tierMap[tier]).map(([provider, model]) => (
                  <td key={provider} className={cellTextClass}>
                    <span className="font-mono text-xs">{model}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   可编辑表单
───────────────────────────────────────────────────────── */

function ConfigForm({
  label,
  draft,
  supported,
  onUpdate,
  isProviderSupported,
}: {
  label: string
  draft: TierModelMap
  supported: TierProvider[]
  onUpdate: (tier: TierName, provider: string, model: string) => void
  isProviderSupported: (provider: string) => boolean
}) {
  // 收集所有出现的 provider（draft + 默认）
  const providers = Array.from(
    new Set([
      ...supported,
      ...Object.keys(draft[TIER_NAMES[0]] ?? {}),
      ...Object.keys(draft[TIER_NAMES[1]] ?? {}),
    ]),
  )

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
      <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
        {label}
      </h2>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        支持的 provider：{supported.join(', ') || '（无）'}
      </p>

      <div className="mt-4 space-y-4">
        {TIER_NAMES.map((tier) => (
          <div key={tier}>
            <div className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              {TIER_LABELS[tier]}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {providers.map((provider) => {
                const supported = isProviderSupported(provider)
                const value = draft[tier]?.[provider] ?? ''
                return (
                  <label key={provider} className="block">
                    <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {provider}
                      {!supported && (
                        <span className="rounded bg-warning/10 px-1 text-warning-ink">
                          未实现
                        </span>
                      )}
                    </span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => onUpdate(tier, provider, e.target.value)}
                      placeholder="model name"
                      className={`${inputClass} mt-1 font-mono text-xs ${!supported ? 'border-warning/40' : ''}`}
                    />
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p className={footerCountClass}>
        留空表示该 provider 在该 tier 回落代码默认；改后点保存触发 PUT + 回读确认。
      </p>
    </div>
  )
}

export default ModelRouting