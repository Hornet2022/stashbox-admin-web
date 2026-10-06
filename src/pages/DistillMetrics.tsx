import { useEffect, useRef } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import { getDistillP95 } from '../api/admin'
import { useApi } from '../hooks/useApi'
import {
  CardSkeleton,
  EmptyState,
  ErrorNotice,
  PageHeader,
  formatDuration,
} from '../components/ui'
import { DISTILL_STEP_LABELS } from '../constants/labels'
import type { DistillP95Response, DistillStepPercentiles } from '../types'
import { sectionTitleClass } from '../components/ui'

/** 4 个蒸馏步骤的展示顺序 */
const STEP_ORDER = [
  { key: 'step1_structure', label: DISTILL_STEP_LABELS.step1_structure },
  { key: 'step2_rewrite', label: DISTILL_STEP_LABELS.step2_rewrite },
  { key: 'step3_tts', label: DISTILL_STEP_LABELS.step3_tts },
  { key: 'step4_concat', label: DISTILL_STEP_LABELS.step4_concat },
]

/**
 * 分位数序列配色。
 *
 * 原来用的是 Tailwind 默认的 blue-500 / orange-500 / red-500 ——
 * 那是脚手架初始化时自带的颜色，跟「暖赭 + 纸感中性」的品牌语言毫无关系，
 * 出现在一个讲「安静 / 留白 / 印刷感」的后台里就是品牌破功。
 * 换成同一色相的三档明度：P50/P95/P99 是同一条轴上的三个刻度，
 * 不是三个并列的类别，用色相区分反而会让人读成三件不同的事。
 * 告警红只在真的越界时才出现。
 */
const BAR_COLORS = {
  p50: 'var(--viz-seq-1)',
  p95: 'var(--viz-seq-2)',
  p99: 'var(--viz-seq-3)',
}

interface MetricCardProps {
  label: string
  metrics: DistillStepPercentiles | null
  loading: boolean
  emphasis?: boolean
}

function MetricCard({ label, metrics, loading, emphasis = false }: MetricCardProps) {
  const cardClass = [
    'rounded-lg border p-4',
    emphasis
      ? 'border-warm-ochre/40 border-l-[3px]'
      : 'border-neutral-200 dark:border-neutral-700',
  ].join(' ')

  if (loading) {
    return (
      <div className={cardClass}>
        {/* uppercase + tracking 打在中文上，两件事都不该做：
   uppercase 对汉字是空操作；正字距在汉字上是排版错误 —— 汉字设计时
   就占满一个 em 字身框，字间塞空会破坏阅读节奏，短标签看着像撑开的
   占位符。分组层级靠字号、字重和颜色来分，不靠字距。 */}
        <div className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
          {label}
        </div>
        <CardSkeleton lines={3} />
      </div>
    )
  }

  const v = metrics
  // 分位数可能因超量程为 null；count=0 是「没跑过」，两者含义不同
  const unresolvable = !!v && v.count > 0 && v.p50 === null

  return (
    <div className={cardClass}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
          {label}
        </span>
        {v && v.count > 0 && (
          <span className="tnum shrink-0 text-[11px] text-neutral-400 dark:text-neutral-500">
            {v.count} 次采样
          </span>
        )}
      </div>
      <dl className="mt-2.5 space-y-1">
        {(['p50', 'p95', 'p99'] as const).map((key) => {
          const label2 = key.toUpperCase()
          const raw = v?.[key]
          return (
            <div key={key} className="flex items-baseline justify-between gap-2">
              <dt className="text-xs text-neutral-400 dark:text-neutral-500">{label2}</dt>
              <dd className="tnum-clip text-sm font-medium text-ink dark:text-neutral-100">
                {!v || v.count === 0 ? (
                  <span className="text-neutral-300 dark:text-neutral-600">—</span>
                ) : raw === null ? (
                  <span
                    className="text-xs font-normal text-warning-ink"
                    title={
                      v.upper_bound
                        ? `样本超出监控量程上限（${formatDuration(v.upper_bound)}），算不出分位数`
                        : '样本超出监控量程，算不出分位数'
                    }
                  >
                    超量程
                  </span>
                ) : (
                  formatDuration(raw)
                )}
              </dd>
            </div>
          )
        })}
      </dl>
      {unresolvable && v?.mean !== null && v?.mean !== undefined && (
        <p className="mt-2 border-t border-neutral-200 pt-2 text-[11px] text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
          均值 {formatDuration(v.mean)}（分位数不可解时它是唯一准确的量）
        </p>
      )}
    </div>
  )
}

/** 单个 bar 的数据条目 */
interface ChartEntry {
  label: string
  p50: number | null
  p95: number | null
  p99: number | null
}

function buildChartData(resp: DistillP95Response): ChartEntry[] {
  // 后端失败路径返回 by_step: {}，正常路径一定有内容 —— 这里仍然兜一层，
  // 因为 `resp.by_step[key]` 在 by_step 整体缺失时会直接抛 TypeError 把整页带崩。
  const byStep = resp.by_step ?? {}
  const entries: ChartEntry[] = STEP_ORDER.map(({ key, label }) => {
    const s = byStep[key]
    return { label, p50: s?.p50 ?? null, p95: s?.p95 ?? null, p99: s?.p99 ?? null }
  })
  return entries
}

export function DistillMetrics() {
  const { data, loading, error, missing, reload } = useApi(getDistillP95, 'distill-p95')

  // 两种 error 不是一回事，别混：
  //   `error` 来自 useApi —— HTTP 层失败（网关挂了、超时）。
  //   `data.error` 来自**响应体** —— 后端抓不到 Prometheus / ai-service metrics 时
  //   返回的是 HTTP 200 + {error: "..."}，不抛异常。
  // 原实现只渲染前者，于是 metrics 后端挂掉时这一页显示「尚无采样」，与
  // 「真的还没跑过蒸馏」完全无法区分 —— 监控在最需要报警的时候静默说谎。
  const backendError = data?.error ?? null
  const effectiveError = error ?? backendError

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    timerRef.current = setInterval(() => reload(), 30_000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [reload])

  const isDark = document.documentElement.classList.contains('dark')
  const chartData = data ? buildChartData(data) : []
  // 全 null 的柱子会让 Y 轴退化成 0~1，刻度全显示成 00000s —— 那种图不如不画
  const hasAnyBar = chartData.some((d) => d.p50 !== null || d.p95 !== null || d.p99 !== null)
  // 别把 4 个阶段的样本数相加说成「共 N 次采样」——那是把同一次蒸馏的
  // 4 个阶段数了 4 遍，读起来像跑了 24 次蒸馏。真实次数是各阶段的最小值
  // （每跑一次蒸馏每个阶段各记一条）。
  const stepCounts = data
    ? Object.values(data.by_step ?? {}).map((v) => v.count ?? 0)
    : []
  const runCount = stepCounts.length ? Math.min(...stepCounts) : 0

  return (
    <div>
      <PageHeader
        title="蒸馏耗时分布"
        description="每个阶段单独计时。语音合成占绝大部分时间，其余几步在百毫秒量级。"
        meta={
          data ? (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              {runCount > 0
                ? `基于 ${runCount} 次蒸馏 · ${data.cached ? '30 秒内为缓存' : '实时读取'}`
                : '尚无采样'}
            </span>
          ) : null
        }
        actions={
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-white hover:text-ink dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
            aria-label="刷新耗时数据"
          >
            <RefreshCw size={14} aria-hidden="true" />
            刷新
          </button>
        }
      />

      {effectiveError && (
        <ErrorNotice
          message={
            backendError
              ? `耗时数据暂不可用：${backendError}`
              : error ?? ''
          }
          missing={missing}
          onRetry={reload}
        />
      )}

      {/* 端到端单独成卡并强调：4 步串行，运营真正关心的是「一篇要等多久」 */}
      <div className="mt-6 max-w-xs">
        <MetricCard
          label="端到端"
          metrics={data?.overall ?? null}
          loading={loading}
          emphasis
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEP_ORDER.map(({ key, label }) => (
          <MetricCard
            key={key}
            label={label}
            metrics={data?.by_step?.[key] ?? null}
            loading={loading}
          />
        ))}
      </div>

      {!loading && data && hasAnyBar && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
          <h2 className={sectionTitleClass}>各阶段耗时对比</h2>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
            横轴为阶段，纵轴为耗时
          </p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--viz-grid)"
                  strokeDasharray="2 4"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'var(--viz-ink)' }}
                  axisLine={{ stroke: 'var(--viz-axis)' }}
                  tickLine={false}
                />
                {/* 不写死刻度，让 recharts 按数据范围自动取整。
                    固定 domain 遇到 4e17 这种量级时，五个刻度会全部
                    渲染成同一个字符串「00000s」，轴就废了。 */}
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--viz-ink)' }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v: number) => formatDuration(v)}
                />
                <Tooltip
                  cursor={{ fill: 'var(--viz-grid)', opacity: 0.35 }}
                  contentStyle={{
                    backgroundColor: isDark ? '#242019' : '#fff',
                    borderColor: isDark ? '#353129' : '#E8E4DD',
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  }}
                  formatter={(value, name) => [
                    value === null || value === undefined ? '—' : formatDuration(value as number),
                    String(name).toUpperCase(),
                  ]}
                />
                <Legend
                  formatter={(value) => value.toUpperCase()}
                  wrapperStyle={{ fontSize: 12, color: 'var(--viz-ink)' }}
                />
                <Bar dataKey="p50" name="p50" fill={BAR_COLORS.p50} radius={[3, 3, 0, 0]} />
                <Bar dataKey="p95" name="p95" fill={BAR_COLORS.p95} radius={[3, 3, 0, 0]} />
                <Bar dataKey="p99" name="p99" fill={BAR_COLORS.p99} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && data && !hasAnyBar && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
          <EmptyState
            title="还没有可绘制的耗时样本"
            hint="跑过一次蒸馏后这里会出现各阶段的分位数对比。"
          />
        </div>
      )}
    </div>
  )
}

export default DistillMetrics
