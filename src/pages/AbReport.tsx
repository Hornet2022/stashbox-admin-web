import { useState } from 'react'
import { getAbReport } from '../api/admin/ab-report'
import { useApi } from '../hooks/useApi'
import { CaveatBanner, ErrorNotice, MetricCard, Skeleton, buttonGhostClass, buttonPrimaryClass, cellStrongClass, cellTextClass, footerCountClass, inputClass, pageHintClass, pageTitleClass, rowClass, tableWrapClass, thClass, theadClass } from '../components/ui'
import { formatNumber } from '../utils'
import type { ABGroup, ABGroupName } from '../types'

/**
 * A/B 实验报表 —— A4 /admin/ab-report（接口文档 §2.2）。
 *
 * ⚠️ 结论有效性硬约束：报表口径从 0029 部署日起算 —— CaveatBanner 强制展示两条 caveats。
 * ⚠️ groups.length < 2 时显示「数据积累中，距 0029 部署起需满 2 周」。
 *
 * 权限：全员可见（实验进展要让运营都知会），CaveatBanner 强提示。
 *
 * CP-NEW.5 完整实现。
 */

const GROUP_LABELS: Record<ABGroupName, string> = {
  personalized: 'personalized · 个性化组（user_id%100<30，ITT）',
  general: 'general · 通用组',
  pre_experiment: 'pre_experiment · 实验前期（0029 上线前数据）',
}

/** 接口文档预置的两条 caveats（每次都展示，与后端 caveats 字段合并） */
const PREDEFINED_CAVEATS = [
  '0029 上线前的历史蒸馏数据 ab_group=NULL，归入 pre_experiment 组，不可用于 A/B 结论',
  'A/B 结论需从 ab_group 落库部署日起重新计 2 周（方案 §2.7-D 周期）',
]

export function AbReport() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  })

  const abState = useApi(
    () =>
      getAbReport({
        date_from: appliedRange.from || undefined,
        date_to: appliedRange.to || undefined,
      }),
    `ab-report|${appliedRange.from}|${appliedRange.to}`,
  )

  const applyFilter = () => {
    setAppliedRange({ from: dateFrom.trim(), to: dateTo.trim() })
  }

  const resetFilter = () => {
    setDateFrom('')
    setDateTo('')
    setAppliedRange({ from: '', to: '' })
  }

  // 过滤合并：实验性组不计
  const visibleGroups: ABGroup[] = (abState.data?.groups ?? []).filter(
    (g) => g.group !== 'pre_experiment',
  )
  const hasEnoughData = visibleGroups.length >= 2
  const allCaveats = [
    ...PREDEFINED_CAVEATS,
    ...(abState.data?.caveats ?? []),
  ]

  return (
    <div>
      <h1 className={pageTitleClass}>A/B 报表</h1>
      <p className={pageHintClass}>
        实验组看到改写版，对照组看到原版，比较两边的完播表现
      </p>

      {/* 强制展示的 caveats */}
      <CaveatBanner variant="danger" title="结论有效性硬约束" items={allCaveats} />

      {/* 时间筛选 */}
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-xs text-neutral-500 dark:text-neutral-400">date_from</span>
          <input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={`${inputClass} mt-1 w-48`}
          />
        </label>
        <label className="block">
          <span className="block text-xs text-neutral-500 dark:text-neutral-400">date_to</span>
          <input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={`${inputClass} mt-1 w-48`}
          />
        </label>
        <button
          type="button"
          className={buttonPrimaryClass}
          onClick={applyFilter}
        >
          应用筛选
        </button>
        <button
          type="button"
          className={buttonGhostClass}
          onClick={resetFilter}
        >
          重置（全量）
        </button>
      </div>

      {abState.error && (
        <ErrorNotice
          message={abState.error}
          missing={abState.missing}
          onRetry={abState.reload}
        />
      )}

      {abState.loading && !abState.data ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : !hasEnoughData ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
          数据积累中，距 0029 部署起需满 2 周才可对比。
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* 各组卡 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visibleGroups.map((group) => (
              <GroupCard key={group.group} group={group} />
            ))}
          </div>

          {/* 对比表 */}
          <div className={tableWrapClass}>
            <table className="w-full text-sm">
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>group</th>
                  <th className={thClass}>tasks</th>
                  <th className={thClass}>eval_count</th>
                  <th className={thClass}>avg_overall</th>
                  <th className={thClass}>completion_rate</th>
                  <th className={thClass}>rewatch_rate</th>
                  <th className={thClass}>skip_rate</th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map((g) => (
                  <CompareRow key={g.group} group={g} />
                ))}
                {abState.data?.groups
                  .filter((g) => g.group === 'pre_experiment')
                  .map((g) => (
                    <CompareRow key={g.group} group={g} muted />
                  ))}
              </tbody>
            </table>
          </div>

          <p className={footerCountClass}>
            注：pre_experiment 组（0029 上线前数据）不参与 A/B 结论；显示用于运营历史对照。
          </p>
        </div>
      )}
    </div>
  )
}

function GroupCard({ group }: { group: ABGroup }) {
  const metrics = [
    {
      key: 'tasks',
      label: '任务数',
      value: group.tasks,
      unit: '',
    },
    {
      key: 'avg_overall_score',
      label: '平均评分',
      value: group.avg_overall_score,
      unit: '/5',
    },
    {
      key: 'completion_rate',
      label: '完听率',
      value: group.completion_rate !== null ? group.completion_rate * 100 : null,
      unit: '%',
    },
    {
      key: 'rewatch_rate',
      label: '复听率',
      value: group.rewatch_rate !== null ? group.rewatch_rate * 100 : null,
      unit: '%',
    },
    {
      key: 'skip_rate',
      label: '跳过率',
      value: group.skip_rate !== null ? group.skip_rate * 100 : null,
      unit: '%',
      tone:
        group.skip_rate !== null && group.skip_rate > 0.1
          ? ('warning' as const)
          : ('muted' as const),
    },
  ]

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
      <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
        {GROUP_LABELS[group.group]}
      </h2>
      <MetricCard label="" metrics={metrics} />
    </div>
  )
}

function CompareRow({ group, muted = false }: { group: ABGroup; muted?: boolean }) {
  const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(2)}%`)
  const cellOpacity = muted ? 'opacity-50' : ''
  return (
    <tr className={rowClass}>
      <td className={cellStrongClass + ' ' + cellOpacity}>{GROUP_LABELS[group.group]}</td>
      <td className={cellTextClass + ' ' + cellOpacity}>{formatNumber(group.tasks)}</td>
      <td className={cellTextClass + ' ' + cellOpacity}>{formatNumber(group.eval_count)}</td>
      <td className={cellTextClass + ' ' + cellOpacity}>
        {group.avg_overall_score !== null ? group.avg_overall_score.toFixed(2) : '—'}
      </td>
      <td className={cellTextClass + ' ' + cellOpacity}>{pct(group.completion_rate)}</td>
      <td className={cellTextClass + ' ' + cellOpacity}>{pct(group.rewatch_rate)}</td>
      <td className={cellTextClass + ' ' + cellOpacity}>{pct(group.skip_rate)}</td>
    </tr>
  )
}

export default AbReport