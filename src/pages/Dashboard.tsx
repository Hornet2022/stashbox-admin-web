import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getStats } from '../api/admin'
import { useApi } from '../hooks/useApi'
import { useThemeStore } from '../store/theme'
import { ErrorNotice, Skeleton, pageHintClass, pageTitleClass } from '../components/ui'
import type { DashboardStats } from '../types'

/**
 * 总览页 —— 接 GET /api/v1/admin/stats（CP3.6-A3）。
 *
 * 5 个指标卡 + 1 条 7 天用户增长折线图。
 * 用户增长趋势端点尚未提供，先用 mock 数据占位（图表结构已就绪）。
 */

const statCards: { label: string; field: keyof DashboardStats; hint: string }[] = [
  { label: '用户总数', field: 'total_users', hint: 'GET /admin/stats' },
  { label: '文章总数', field: 'total_articles', hint: 'GET /admin/stats' },
  { label: '蒸馏完成', field: 'total_distilled', hint: 'GET /admin/stats' },
  { label: '活跃音频', field: 'active_audio_files', hint: 'GET /admin/stats' },
  {
    label: '24h 失败蒸馏',
    field: 'failed_distillations_24h',
    hint: 'GET /admin/stats',
  },
]

/** 7 天用户增长（mock —— 趋势端点待上线） */
const growthMock = [
  { day: '09-11', users: 120 },
  { day: '09-12', users: 138 },
  { day: '09-13', users: 151 },
  { day: '09-14', users: 149 },
  { day: '09-15', users: 176 },
  { day: '09-16', users: 194 },
  { day: '09-17', users: 213 },
]

/** 图表配色随主题切换 */
const chartColors = {
  light: { grid: '#f1f5f9', axis: '#94a3b8', line: '#1e293b' },
  dark: { grid: '#334155', axis: '#64748b', line: '#e2e8f0' },
}

export function Dashboard() {
  const { data, loading, error, missing, reload } = useApi(getStats, 'stats')
  const theme = useThemeStore((s) => s.theme)
  const colors = theme === 'dark' ? chartColors.dark : chartColors.light

  return (
    <div>
      <h1 className={pageTitleClass}>总览</h1>
      <p className={pageHintClass}>数据源：GET /api/v1/admin/stats</p>

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.field}
            className="rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="text-sm text-gray-500 dark:text-slate-400">
              {card.label}
            </div>
            {loading ? (
              <div className="mt-3">
                <Skeleton className="h-7 w-20" />
              </div>
            ) : (
              <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">
                {data ? data[card.field].toLocaleString('zh-CN') : '—'}
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              {card.hint}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            近 7 天用户增长
          </h2>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            mock 数据（趋势端点待上线）
          </span>
        </div>
        <div className="mt-4 h-72">
          {loading ? (
            <div className="flex h-full items-end gap-3">
              {[40, 55, 48, 62, 70, 80, 92].map((height, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{ height: `${height}%` }}
                >
                  <Skeleton className="h-full w-full" />
                </div>
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthMock}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  stroke={colors.axis}
                />
                <YAxis tick={{ fontSize: 12 }} stroke={colors.axis} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="users"
                  name="用户数"
                  stroke={colors.line}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
