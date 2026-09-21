import { useEffect, useRef } from 'react'
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import { getDistillP95 } from '../api/admin'
import { useApi } from '../hooks/useApi'
import { CardSkeleton, ErrorNotice, pageHintClass, pageTitleClass } from '../components/ui'
import type { DistillP95Response, DistillStepPercentiles } from '../types'

/** 4 个蒸馏步骤的展示顺序和标签 */
const STEP_ORDER = [
  { key: 'step1_structure', label: '结构提取' },
  { key: 'step2_rewrite', label: '内容改写' },
  { key: 'step3_tts', label: '语音合成' },
  { key: 'step4_concat', label: '音频拼接' },
]

const OVERALL_KEY = 'overall'
const OVERALL_LABEL = '整体均值'

/** 配色：P50 蓝 / P95 橙 / P99 红 */
const BARColors = {
  p50: '#3B82F6',
  p95: '#F97316',
  p99: '#EF4444',
}

interface MetricCardProps {
  label: string
  metrics: DistillStepPercentiles | null
  loading: boolean
}

function MetricCard({ label, metrics, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
        <CardSkeleton lines={3} />
      </div>
    )
  }

  const vals = metrics ?? { p50: null, p95: null, p99: null }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-3 space-y-1">
        {[
          { key: 'p50', label: 'P50', value: vals.p50 },
          { key: 'p95', label: 'P95', value: vals.p95 },
          { key: 'p99', label: 'P99', value: vals.p99 },
        ].map(({ key, label: lbl, value }) => (
          <div key={key} className="flex items-baseline gap-1">
            <span className="text-xs text-neutral-400 dark:text-neutral-500">{lbl}</span>
            <span className="font-serif text-xl font-semibold text-ink dark:text-neutral-100">
              {value !== null ? value.toFixed(2) : '—'}
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">秒</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 单个 bar 的数据条目 */
interface ChartEntry {
  step: string
  label: string
  p50: number | null
  p95: number | null
  p99: number | null
}

function buildChartData(resp: DistillP95Response): ChartEntry[] {
  const entries: ChartEntry[] = STEP_ORDER.map(({ key, label }) => {
    const s = resp.by_step[key] ?? { p50: null, p95: null, p99: null }
    return { step: key, label, p50: s.p50, p95: s.p95, p99: s.p99 }
  })
  entries.push({
    step: OVERALL_KEY,
    label: OVERALL_LABEL,
    p50: resp.overall.p50,
    p95: resp.overall.p95,
    p99: resp.overall.p99,
  })
  return entries
}

export function DistillMetrics() {
  const { data, loading, error, missing, reload } = useApi(getDistillP95, 'distill-p95')

  // 30s 定时刷新
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    timerRef.current = setInterval(() => reload(), 30_000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [reload])

  const isDark = document.documentElement.classList.contains('dark')
  const axisColor = isDark ? '#8C8680' : '#8C8680'

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className={pageTitleClass}>蒸馏耗时分布</h1>
          <p className={pageHintClass}>来自 ai-service Prometheus，30s 缓存</p>
        </div>
        {data && (
          <div className="mt-0.5 flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <RefreshCw size={12} className={data.cached ? 'animate-spin' : ''} />
            {data.cached ? 'Cached 30s' : 'Live'}
          </div>
        )}
      </div>

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      {/* 4 个 step cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STEP_ORDER.map(({ key, label }) => (
          <MetricCard
            key={key}
            label={label}
            metrics={data?.by_step[key] ?? null}
            loading={loading}
          />
        ))}
      </div>

      {/* Overall card */}
      <div className="mt-4 max-w-xs">
        <MetricCard label={OVERALL_LABEL} metrics={data?.overall ?? null} loading={loading} />
      </div>

      {/* Bar chart */}
      {!loading && data && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
          <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
            蒸馏耗时分布
          </h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={buildChartData(data)}
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  stroke={axisColor}
                />
                <YAxis tick={{ fontSize: 12 }} stroke={axisColor} unit="s" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#fff',
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    value !== null && value !== undefined
                      ? `${(value as number).toFixed(3)}s`
                      : '—',
                    String(name).toUpperCase(),
                  ]}
                />
                <Legend
                  formatter={(value) => value.toUpperCase()}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="p50" name="p50" fill={BARColors.p50} radius={[2, 2, 0, 0]} />
                <Bar dataKey="p95" name="p95" fill={BARColors.p95} radius={[2, 2, 0, 0]} />
                <Bar dataKey="p99" name="p99" fill={BARColors.p99} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

export default DistillMetrics
