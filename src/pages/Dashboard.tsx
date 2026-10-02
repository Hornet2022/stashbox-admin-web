import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { getStats, getDistillP95 } from '../api/admin'
import { useApi } from '../hooks/useApi'
import {
  EmptyState,
  ErrorNotice,
  PageHeader,
  StatCard,
  formatDuration,
  formatRelativeTime,
  type StatTone,
} from '../components/ui'
import { DISTILL_STEP_LABELS, SOURCE_LABELS, TONE_BG, labelFor } from '../constants/labels'
import type { DashboardStats } from '../types'

/**
 * 总览页。
 *
 * 这页回答一个问题：**现在有什么需要我处理？**
 * 所以版面按「先要处理的 / 再看存量的」排，而不是按数据库表的顺序排。
 * 8 张等权重的卡等于没有卡 —— 扫视时眼睛找不到落点。
 */

interface CardSpec {
  key: string
  label: string
  field: keyof DashboardStats
  /** 口径说明：解释这个数怎么来的，用业务语言。 */
  footnote: string
  tone?: StatTone
  emphasis?: boolean
  /** 数值越高越糟 */
  dangerWhenHigh?: boolean
  /** 用百分比呈现 */
  asPercent?: boolean
}

export function Dashboard() {
  const { data, loading, error, missing, reload } = useApi(getStats, 'stats')
  const { data: p95 } = useApi(getDistillP95, 'distill-p95')
  // useApi 不返回 last_fetched，用惰性初始化 `() => Date.now()` 触发重渲染刷新相对时间
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

  const revenueMissing = stats?.revenue_available === false

  // ── 第一梯队：需要动作的 ──────────────────────────────────────
  const attentionCards: CardSpec[] = [
    {
      key: 'failed_24h',
      label: '24h 蒸馏失败',
      field: 'failed_distillations_24h',
      footnote: '近 24 小时失败的蒸馏任务',
      dangerWhenHigh: true,
      tone: 'bad',
    },
    {
      key: 'pending',
      label: '等待蒸馏',
      field: 'pending',
      footnote: '已剪藏、还没产出音频',
      tone: 'accent',
      emphasis: true,
    },
    {
      key: 'success_rate',
      label: '蒸馏成功率',
      field: 'distill_success_rate',
      footnote: '成功 /（成功 + 失败），全量累计',
      asPercent: true,
    },
  ]

  // ── 第二梯队：存量与规模，看趋势用 ─────────────────────────────
  const overviewCards: CardSpec[] = [
    {
      key: 'users',
      label: '用户总数',
      field: 'total_users',
      footnote: '注册用户累计',
    },
    {
      key: 'articles',
      label: '文章总数',
      field: 'total_articles',
      footnote: '不含已删除',
    },
    { key: 'listened', label: '已收听', field: 'listened', footnote: '状态已推进到「已收听」的文章' },
    {
      key: 'audio',
      label: '可用音频',
      field: 'active_audio_files',
      footnote: '蒸馏完成且音频地址有效',
    },
    {
      key: 'revenue',
      label: '本月营收',
      field: 'revenue',
      footnote: revenueMissing
        ? '未接入支付，无营收数据'
        : '本月已支付订单合计',
      tone: revenueMissing ? 'warn' : 'neutral',
    },
  ]

  const renderValue = (card: CardSpec): string => {
    const v = stats?.[card.field]
    if (v === null || v === undefined) return '—'
    if (card.asPercent) return `${Math.round((v as number) * 100)}%`
    return (v as number).toLocaleString('zh-CN')
  }

  const renderCard = (card: CardSpec) => {
    const raw = stats?.[card.field]
    const isDanger = !!card.dangerWhenHigh && Number(raw ?? 0) > 5
    return (
      <StatCard
        key={card.key}
        label={card.label}
        value={renderValue(card)}
        tone={isDanger ? 'bad' : (card.tone ?? 'neutral')}
        emphasis={card.emphasis}
        footnote={card.footnote}
        loading={loading}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="总览"
        description="内容生产与消费的当前水位。先看需要处理的，再看存量。"
        meta={
          stats?.generated_at ? (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              更新于 {formatRelativeTime(stats.generated_at)}
            </span>
          ) : null
        }
        actions={
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-white hover:text-ink dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
            aria-label="手动刷新统计数据"
          >
            <RefreshCw size={14} aria-hidden="true" />
            刷新
          </button>
        }
      />

      {warningActive && warning && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-medium">{warning.message}</div>
            <div className="mt-1 text-xs opacity-75">
              阈值 {warning.threshold} 条 / 24 小时 · 实际 {warning.actual} 条
            </div>
          </div>
        </div>
      )}

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      {/* 24h 环比：只挂在「新增」类指标上，且必须带基线说明。
          旧实现把 new_users_24h 的 delta_pct 贴在「用户总数」旁边，
          27 后面跟一个红色 -96%，读起来就是「总用户跌了 96%」——
          这是个假结论，delta 说的其实是另一件事。 */}
      {stats?.comparison && (
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          {(['new_users_24h', 'new_articles_24h'] as const).map((k) => {
            const c = stats.comparison?.[k]
            if (!c) return null
            if (c.delta_pct === null || c.delta_pct === undefined) {
              return (
                <span key={k} className="text-neutral-400 dark:text-neutral-500">
                  {k === 'new_users_24h' ? '新增用户' : '新增文章'} 今日 {c.today} · 昨日无数据
                </span>
              )
            }
            const pct = Math.round(c.delta_pct * 100)
            const sign = pct > 0 ? '+' : ''
            const tone =
              pct > 0
                ? 'text-success'
                : pct < 0
                  ? 'text-error'
                  : 'text-neutral-400'
            return (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="text-neutral-400 dark:text-neutral-500">
                  {k === 'new_users_24h' ? '新增用户' : '新增文章'} 今日较昨日
                </span>
                <span className={`tnum font-medium ${tone}`}>
                  {sign}
                  {pct}%
                </span>
                <span className="tnum text-neutral-400 dark:text-neutral-500">
                  （{c.today} / {c.yesterday}）
                </span>
              </span>
            )
          })}
        </div>
      )}

      <Section title="需要关注" caption="先看这里">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attentionCards.map(renderCard)}
        </div>
      </Section>

      <Section title="规模与存量">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {overviewCards.map(renderCard)}
        </div>
      </Section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SourceBreakdown stats={stats} loading={loading} />
        <DistillDuration p95={p95} />
      </div>

      <Section title="近 7 天趋势" caption="按天分桶，柱子相对当天峰值归一">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (
          <TrendPanel stats={stats} />
        )}
      </Section>
    </div>
  )
}

/* ── 小节标题 ──────────────────────────────────────────────────── */

function Section({
  title,
  caption,
  children,
}: {
  title: string
  caption?: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-ink dark:text-neutral-100">
          {title}
        </h2>
        {caption && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">{caption}</span>
        )}
      </div>
      {children}
    </section>
  )
}

/* ── 来源分布 ──────────────────────────────────────────────────── */

function SourceBreakdown({
  stats,
  loading,
}: {
  stats: DashboardStats | null
  loading: boolean
}) {
  // 库里有同义 slug：生产库同时存在 wechat(23) 和 wechat_mp(1)，两个都指
  // 微信公众号。不合并的话，界面上会出现两行字面完全相同的「微信公众号」，
  // 运营会以为是渲染出了 bug。按**显示名**聚合，原始 slug 收进 title 备查 ——
  // 既给出正确的合计，又不把「库里有两个写法」这件事藏起来。
  const merged = new Map<string, { n: number; raws: string[] }>()
  for (const [raw, n] of Object.entries(stats?.by_source ?? {})) {
    const label = labelFor(SOURCE_LABELS, raw).label
    const cur = merged.get(label)
    if (cur) {
      cur.n += n
      cur.raws.push(raw)
    } else {
      merged.set(label, { n, raws: [raw] })
    }
  }
  const entries = [...merged.entries()]
    .map(([label, v]) => ({ label, n: v.n, raw: v.raws.join(' / ') }))
    .sort((a, b) => b.n - a.n)
  const total = entries.reduce((s, e) => s + e.n, 0)

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
      <h2 className="text-sm font-semibold text-ink dark:text-neutral-100">文章来源分布</h2>
      {loading ? (
        <div className="mt-4 h-40 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
      ) : entries.length === 0 ? (
        <EmptyState title="还没有文章" hint="运营在后台录入或用户剪藏后，这里会出现来源构成。" />
      ) : (
        <ul className="mt-4 space-y-2.5">
          {entries.map((e, idx) => {
            const pct = total > 0 ? (e.n / total) * 100 : 0
            const tone = TONE_BG_ORDER[idx % TONE_BG_ORDER.length]
            return (
              <li key={e.label} className="flex items-center gap-3">
                <span
                  className="w-28 shrink-0 truncate text-xs text-neutral-600 dark:text-neutral-300"
                  title={e.raw}
                >
                  {e.label}
                </span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${TONE_BG[tone]}`}
                    style={{ width: `${Math.max(pct, 1.5)}%` }}
                  />
                </span>
                <span className="tnum w-20 shrink-0 text-right text-xs text-neutral-500 dark:text-neutral-400">
                  {e.n} · {Math.round(pct)}%
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const TONE_BG_ORDER = ['ochre', 'sage', 'amber', 'slate', 'stone', 'clay'] as const

/* ── 蒸馏耗时 ──────────────────────────────────────────────────── */

function DistillDuration({
  p95,
}: {
  p95: Awaited<ReturnType<typeof getDistillP95>> | null
}) {
  const rows = p95
    ? Object.entries(p95.by_step).map(([key, v]) => ({ key, label: DISTILL_STEP_LABELS[key] ?? key, ...v }))
    : []

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
      <h2 className="text-sm font-semibold text-ink dark:text-neutral-100">蒸馏耗时</h2>
      <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
        按步骤拆分；P50 是中位数，P95 是最慢的 5%
      </p>
      {!p95 ? (
        <div className="mt-4 h-40 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
      ) : rows.length === 0 ? (
        <EmptyState title="还没有耗时样本" hint="跑过一次蒸馏后这里才会出现数据。" />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-neutral-400 dark:text-neutral-500">
                <th className="pb-1.5 pr-3 font-normal">步骤</th>
                <th className="pb-1.5 pr-3 text-right font-normal">P50</th>
                <th className="pb-1.5 pr-3 text-right font-normal">P95</th>
                <th className="pb-1.5 text-right font-normal">样本</th>
              </tr>
            </thead>
            <tbody className="tnum">
              <tr className="border-t border-neutral-200 font-medium dark:border-neutral-700">
                <td className="py-1.5 pr-3 text-ink dark:text-neutral-100">
                  {DISTILL_STEP_LABELS.overall}
                </td>
                <td className="py-1.5 pr-3 text-right text-ink dark:text-neutral-100">
                  {p95.overall.p50 === null ? (
                    <OutOfRange upper={p95.overall.upper_bound} />
                  ) : (
                    formatDuration(p95.overall.p50)
                  )}
                </td>
                <td className="py-1.5 pr-3 text-right text-ink dark:text-neutral-100">
                  {p95.overall.p95 === null ? (
                    <OutOfRange upper={p95.overall.upper_bound} />
                  ) : (
                    formatDuration(p95.overall.p95)
                  )}
                </td>
                <td className="py-1.5 text-right text-neutral-400">{p95.overall.count}</td>
              </tr>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-neutral-200 dark:border-neutral-700">
                  <td className="py-1.5 pr-3 text-neutral-600 dark:text-neutral-300">{r.label}</td>
                  <td className="py-1.5 pr-3 text-right text-neutral-600 dark:text-neutral-300">
                    {r.p50 === null ? <OutOfRange upper={r.upper_bound} /> : formatDuration(r.p50)}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-neutral-600 dark:text-neutral-300">
                    {r.p95 === null ? <OutOfRange upper={r.upper_bound} /> : formatDuration(r.p95)}
                  </td>
                  <td className="py-1.5 text-right text-neutral-400">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* 样本量是分位数的可信度锚点：3 个样本算出的 P95 基本没有意义，
              不标出来的话运营会把噪声当信号。 */}
          <p className="mt-3 text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
            分位数基于右上角样本数计算，样本量少时波动大，仅供趋势参考。
          </p>
        </div>
      )}
    </div>
  )
}

/** 分位数超出直方图量程 —— 说清楚是「量程不够」而不是「没有数据」。 */
function OutOfRange({ upper }: { upper: number | null }) {
  return (
    <span
      className="inline-flex items-center text-[11px] text-warning"
      title={
        upper
          ? `样本超出了监控量程上限（${formatDuration(upper)}），无法算出分位数`
          : '样本超出了监控量程，无法算出分位数'
      }
    >
      超量程
    </span>
  )
}

/* ── 7 日趋势 ──────────────────────────────────────────────────── */

function TrendPanel({ stats }: { stats: DashboardStats | null }) {
  const series = [
    { title: '新增文章', rows: stats?.trends?.articles_created_7d ?? [] },
    { title: '新增用户', rows: stats?.trends?.users_created_7d ?? [] },
    { title: '蒸馏完成', rows: stats?.trends?.distill_completed_7d ?? [] },
  ]
  const allZero = series.every((s) => fillLast7Days(s.rows).every((r) => r.count === 0))

  if (allZero) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
        <EmptyState
          title="近 7 天没有新增数据"
          hint="有剪藏、注册或蒸馏完成记录后，这里会显示按天的柱状分布。"
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {series.map((s) => (
        <TrendBar key={s.title} title={s.title} rows={s.rows} />
      ))}
    </div>
  )
}

function TrendBar({ title, rows }: { title: string; rows: Array<{ date: string; count: number }> }) {
  const filled = fillLast7Days(rows)
  const max = Math.max(1, ...filled.map((r) => r.count))
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{title}</h3>
        <span className="tnum text-xs text-neutral-400 dark:text-neutral-500">
          共 {filled.reduce((s, r) => s + r.count, 0)}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {filled.map((r) => (
          <li key={r.date} className="flex items-center gap-2">
            <span className="tnum w-10 shrink-0 text-[11px] text-neutral-400 dark:text-neutral-500">
              {r.date.slice(5)}
            </span>
            <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              {r.count > 0 && (
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-warm-ochre"
                  style={{ width: `${Math.max((r.count / max) * 100, 4)}%` }}
                />
              )}
            </span>
            <span
              className={`tnum w-6 shrink-0 text-right text-[11px] ${
                r.count > 0
                  ? 'text-neutral-600 dark:text-neutral-300'
                  : 'text-neutral-300 dark:text-neutral-600'
              }`}
            >
              {r.count}
            </span>
          </li>
        ))}
      </ul>
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

export default Dashboard
