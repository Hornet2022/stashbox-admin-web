import { CaveatBanner, Skeleton } from '../ui'
import type { PoolHealthReport } from '../../types'

/**
 * 听感池健康度卡 —— A2 /api/v1/admin/few-shot-pool/health。
 *
 * 三档染色：health_score <60 error / 60-80 warning / ≥80 success。
 * warning 非空 → 顶部 CaveatBanner（warning variant）。
 */
export function PoolHealthCard({
  data,
  loading,
}: {
  data: PoolHealthReport | null
  loading: boolean
}) {
  if (loading && !data) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">池健康度</div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const score = data.health_score
  const scoreTone =
    score >= 80
      ? 'text-success'
      : score >= 60
        ? 'text-warning'
        : 'text-error'
  const scoreLabel =
    score >= 80 ? '良好' : score >= 60 ? '一般' : '需关注'

  return (
    <div className="space-y-4">
      {data.warning && (
        <CaveatBanner
          variant="warning"
          items={[poolWarningText(data.warning)]}
        />
      )}

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">池健康度</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`font-serif text-3xl font-semibold ${scoreTone}`}>
                {score.toFixed(1)}
              </span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {scoreLabel}
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-neutral-400 dark:text-neutral-500">
            GET /admin/few-shot-pool/health
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="总条目" value={data.total_count} />
          <StatTile label="高分" value={data.high_score_count} tone="success" />
          <StatTile label="中分" value={data.medium_score_count} tone="warning" />
          <StatTile label="低分" value={data.low_score_count} tone="error" />
          <StatTile label="活跃" value={data.active_count} />
          <StatTile label="陈旧" value={data.stale_count} tone={data.stale_count > 50 ? 'warning' : 'muted'} />
          <StatTile label="高分占比" value={`${pct(data.high_score_count, data.total_count)}%`} />
          <StatTile
            label="活跃占比"
            value={`${pct(data.active_count, data.total_count)}%`}
          />
        </div>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  tone = 'muted',
}: {
  label: string
  value: number | string
  tone?: 'success' | 'warning' | 'error' | 'muted'
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'error'
          ? 'text-error'
          : 'text-ink dark:text-neutral-100'
  return (
    <div className="rounded-md border border-neutral-100 bg-white/40 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/30">
      <div className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {label}
      </div>
      <div className={`mt-0.5 font-serif text-lg font-semibold ${toneClass}`}>
        {value}
      </div>
    </div>
  )
}

function pct(part: number, total: number): string {
  if (total === 0) return '0'
  return ((part / total) * 100).toFixed(1)
}

/** warning 标签翻译 */
function poolWarningText(w: NonNullable<PoolHealthReport['warning']>): string {
  switch (w) {
    case 'insufficient':
      return '池总量过低（<100 条），蒸馏时 step2 few-shot 检索可能退化为空'
    case 'low_high_score':
      return '高分条目不足，Few-shot 改写质量可能下滑'
    case 'stale':
      return '陈旧条目过多，建议触发清理（cleanup 端点）'
    default:
      return String(w)
  }
}