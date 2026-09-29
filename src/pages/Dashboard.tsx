import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { getStats, getDistillP95 } from '../api/admin'
import { useApi } from '../hooks/useApi'
import { ErrorNotice, Skeleton, pageHintClass, pageTitleClass } from '../components/ui'
import type { DashboardStats } from '../types'

/**
 * 总览页 —— 接 GET /api/v1/admin/stats + GET /api/v1/admin/distill-p95（CP3.6-A3 + CP-STATS-REWORK）。
 *
 * 设计要点：
 *   - 7 张原卡片保留 + 4 个新卡片：distill_success_rate / failed_articles_24h /
 *     by_source 列表 / trends 柱状图
 *   - 蒸馏耗时（P50/P95/P99）从 distill-p95 端点接（之前前端没用上）
 *   - 异常告警 warning：failed_distillations_24h > 阈值时顶部 banner + 卡片变红
 *   - revenue_available=false 时给「orders 表缺失」tooltip，不再误以为 0 是真实
 *   - 手动刷新按钮：cache TTL 30s 之内 useApi 不重发，按钮强制 reload
 *   - 渲染防御化：字段缺失显示 "—" 而不是崩溃
 *
 * 注意：useApi 内部 wrap 一次 fetch。手动刷新用 reload()（重新 mount）。
 */

function formatDelta(delta: number | null | undefined): { text: string; tone: string } | null {
  if (delta === null || delta === undefined) return null
  const pct = Math.round(delta * 100)
  const sign = pct > 0 ? '+' : ''
  const tone =
    pct > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : pct < 0
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-neutral-500 dark:text-neutral-400'
  return { text: `${sign}${pct}%`, tone }
}

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  const secs = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (secs < 60) return `${secs} 秒前更新`
  if (secs < 3600) return `${Math.floor(secs / 60)} 分钟前更新`
  if (secs < 86400) return `${Math.floor(secs / 3600)} 小时前更新`
  return `${Math.floor(secs / 86400)} 天前更新`
}

export function Dashboard() {
  const { data, loading, error, missing, reload } = useApi(getStats, 'stats')
  const { data: p95 } = useApi(getDistillP95, 'distill-p95')
  // useApi 不返回 last_fetched，但 useState 模拟 force refresh
  // 用惰性初始化 `() => Date.now()` 而不是 `Date.now()`：后者在每次 render 都会求值
  // （虽然只有首次结果被采纳），既是无谓开销，也踩 oxlint 的 render 期纯度规则。
  const [, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const stats: DashboardStats | null = data
  const warning = stats?.warning
  const warningActive =
    warning != null &&
    typeof warning.actual === 'number' &&
    typeof warning.threshold === 'number' &&
    warning.actual > warning.threshold

  // 7 个原卡片 + 1 个新卡片（distill_success_rate）
  const mainCards: Array<{
    label: string
    field: keyof DashboardStats
    hint: string
    showDelta?: keyof DashboardStats
    compareKey?: keyof NonNullable<DashboardStats['comparison']>
    dangerWhenHigh?: boolean
  }> = [
    { label: '用户总数', field: 'total_users', hint: 'DB users 表', compareKey: 'new_users_24h' },
    { label: '文章总数', field: 'total_articles', hint: '排除 deleted_at', compareKey: 'new_articles_24h' },
    { label: '蒸馏队列中', field: 'pending', hint: 'Article.status=pending' },
    { label: '已收听', field: 'listened', hint: 'Article.status=listened' },
    {
      label: '活跃音频',
      field: 'active_audio_files',
      hint: 'DistilledArticle done + audio_url',
    },
    {
      label: '24h 蒸馏失败',
      field: 'failed_distillations_24h',
      hint: 'DistilledArticle.status=failed + updated_at > 24h',
      dangerWhenHigh: true,
    },
    {
      label: '本月营收',
      field: 'revenue',
      hint:
        stats?.revenue_available === false
          ? 'orders 表缺失（revenue_available=false），不是真实 0'
          : 'orders 本月 paid 合计',
    },
    {
      label: '蒸馏成功率',
      field: 'distill_success_rate',
      hint: 'done / (done + failed) 全量',
    },
  ]

  return (
    <div>
      {/* 顶部 header + 手动刷新 */}
      <div className="flex items-baseline justify-between">
        <h1 className={pageTitleClass}>总览</h1>
        <div className="flex items-center gap-3">
          {stats?.generated_at && (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              {formatTimeAgo(stats.generated_at)}
            </span>
          )}
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            aria-label="手动刷新统计数据"
          >
            <RefreshCw size={14} aria-hidden="true" />
            刷新
          </button>
        </div>
      </div>
      <p className={pageHintClass}>
        数据源：GET /api/v1/admin/stats（Redis 30s 缓存）+ GET /api/v1/admin/distill-p95
      </p>

      {/* 异常告警 banner */}
      {warningActive && warning && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-100"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <div className="font-medium">{warning.message}</div>
            <div className="mt-1 text-xs opacity-80">
              阈值：{warning.threshold} 条 / 24h · 实际：{warning.actual} 条
            </div>
          </div>
        </div>
      )}

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      {/* 主卡片：8 张 */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mainCards.map((card) => {
          const value = stats?.[card.field]
          const isDanger = !!card.dangerWhenHigh && Number(value ?? 0) > 5
          const compare = card.compareKey && stats?.comparison?.[card.compareKey]
          const delta = compare ? formatDelta(compare.delta_pct) : null

          return (
            <div
              key={card.field as string}
              className={`rounded-lg border p-5 ${
                isDanger
                  ? 'border-rose-300 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-900/20'
                  : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50'
              }`}
            >
              <div className="text-sm text-neutral-500 dark:text-neutral-400">{card.label}</div>
              {loading ? (
                <div className="mt-3">
                  <Skeleton className="h-7 w-20" />
                </div>
              ) : (
                <div className="mt-2 flex items-baseline gap-2">
                  <div
                    className={`font-serif text-2xl font-semibold ${
                      isDanger
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-ink dark:text-neutral-100'
                    }`}
                  >
                    {value === null || value === undefined
                      ? '—'
                      : card.field === 'distill_success_rate'
                        ? `${Math.round((value as number) * 100)}%`
                        : (value as number).toLocaleString('zh-CN')}
                  </div>
                  {delta && (
                    <div className={`text-xs font-medium ${delta.tone}`} aria-label="24h 环比">
                      {delta.text}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{card.hint}</div>
            </div>
          )
        })}
      </div>

      {/* 中部：来源分布 + 蒸馏耗时 */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 来源分布 */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
          <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
            文章来源分布
          </h2>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
            按 Article.source 聚合（不含 deleted_at）
          </p>
          {loading ? (
            <div className="mt-4">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !stats?.by_source || Object.keys(stats.by_source).length === 0 ? (
            <div className="mt-4 flex h-32 items-center justify-center rounded border border-dashed border-neutral-300 text-sm text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
              暂无文章
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {Object.entries(stats.by_source)
                .sort((a, b) => b[1] - a[1])
                .map(([src, n]) => {
                  const total = Object.values(stats.by_source!).reduce((s, v) => s + v, 0)
                  const pct = total > 0 ? Math.round((n / total) * 100) : 0
                  return (
                    <div key={src} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-neutral-600 dark:text-neutral-300">{src}</div>
                      <div className="relative h-2 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-700">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-sky-500 dark:bg-sky-400"
                          style={{ width: `${pct}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="w-20 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                        {n.toLocaleString('zh-CN')} · {pct}%
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* 蒸馏耗时 P50/P95/P99 */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
          <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
            蒸馏耗时 P50/P95/P99
          </h2>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
            从 ai-service Prometheus 解析（CP-DISTILL-PROM-SDK）
          </p>
          {!p95 ? (
            <div className="mt-4 flex h-32 items-center justify-center rounded border border-dashed border-neutral-300 text-sm text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
              暂无数据（ai-service 未上报 metrics）
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-neutral-500 dark:text-neutral-400">
                    <th className="px-2 py-1 font-normal">step</th>
                    <th className="px-2 py-1 text-right font-normal">P50</th>
                    <th className="px-2 py-1 text-right font-normal">P95</th>
                    <th className="px-2 py-1 text-right font-normal">P99</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  <tr className="border-t border-neutral-200 dark:border-neutral-700">
                    <td className="px-2 py-1.5 font-sans font-medium">overall</td>
                    <td className="px-2 py-1.5 text-right">{fmtSec(p95.overall.p50)}</td>
                    <td className="px-2 py-1.5 text-right">{fmtSec(p95.overall.p95)}</td>
                    <td className="px-2 py-1.5 text-right">{fmtSec(p95.overall.p99)}</td>
                  </tr>
                  {Object.entries(p95.by_step).map(([step, qs]) => (
                    <tr key={step} className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-2 py-1.5 font-sans">{step}</td>
                      <td className="px-2 py-1.5 text-right">{fmtSec(qs.p50)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtSec(qs.p95)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtSec(qs.p99)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 底部：7 日趋势柱状图 */}
      <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
        <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
          近 7 天趋势
        </h2>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          按 day 分桶；空日显示 0；柱子相对当天最大值归一
        </p>
        {loading ? (
          <div className="mt-4">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
            <TrendBar
              title="新增文章"
              rows={stats?.trends?.articles_created_7d ?? []}
              colorClass="bg-sky-500 dark:bg-sky-400"
            />
            <TrendBar
              title="新增用户"
              rows={stats?.trends?.users_created_7d ?? []}
              colorClass="bg-emerald-500 dark:bg-emerald-400"
            />
            <TrendBar
              title="蒸馏完成"
              rows={stats?.trends?.distill_completed_7d ?? []}
              colorClass="bg-violet-500 dark:bg-violet-400"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// 简单柱状图（按 day 序列画水平 bar，避免拉图表库）
function TrendBar({
  title,
  rows,
  colorClass,
}: {
  title: string
  rows: Array<{ date: string; count: number }>
  colorClass: string
}) {
  // 补齐到 7 天（缺失的 day 显示 0）
  const filled = fillLast7Days(rows)
  const max = Math.max(1, ...filled.map((r) => r.count))
  return (
    <div>
      <h3 className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{title}</h3>
      <div className="mt-2 space-y-1.5">
        {filled.map((r) => {
          const pct = Math.round((r.count / max) * 100)
          return (
            <div key={r.date} className="flex items-center gap-2 text-xs">
              <div className="w-16 shrink-0 text-neutral-400 dark:text-neutral-500">
                {r.date.slice(5)}
              </div>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className={`absolute inset-y-0 left-0 ${colorClass}`}
                  style={{ width: `${pct}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="w-10 shrink-0 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-300">
                {r.count}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function fillLast7Days(
  rows: Array<{ date: string; count: number }>
): Array<{ date: string; count: number }> {
  const out: Array<{ date: string; count: number }> = []
  const map = new Map(rows.map((r) => [r.date, r.count]))
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    out.push({ date: iso, count: map.get(iso) ?? 0 })
  }
  return out
}

function fmtSec(v: number | null): string {
  if (v === null || v === undefined) return '—'
  if (v < 1) return `${(v * 1000).toFixed(0)}ms`
  if (v < 60) return `${v.toFixed(2)}s`
  return `${(v / 60).toFixed(1)}min`
}

export default Dashboard