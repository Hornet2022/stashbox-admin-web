import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { getPoolHealth, listPool } from '../api/admin/few-shot-pool'
import { useApi } from '../hooks/useApi'
import { PoolHealthCard } from '../components/pool/PoolHealthCard'
import { PoolAuditWorkflow } from '../components/pool/PoolAuditWorkflow'
import {
  Badge,
  EmptyRow,
  ErrorNotice,
  SlidingTabs,
  Skeleton,
  buttonGhostClass,
  cellMutedClass,
  cellStrongClass,
  cellTextClass,
  footerCountClass,
  inputClass,
  pageHintClass,
  pageTitleClass,
  rowClass,
  tableWrapClass,
  thClass,
  theadClass,
} from '../components/ui'
import { formatTime } from '../utils'
import type { FewShotKind, PoolExample } from '../types'

/**
 * 听感池 —— A2 池列表 + A6 池抽查工作流 合成一页（CP-NEW.1 q3 拍板）。
 *
 * SlidingTabs 切换：
 *   - 「健康度 + 列表」：健康度卡 + few-shot 条目列表 + 过滤分页
 *   - 「清理 + 抽查」：cleanup 危险操作 + audit-sample 3 步工作流
 *
 * 上线硬前提：alembic 0029 已执行（evaluator_id / ab_group 列）。
 *
 * CP-NEW.2 完整实现。
 */

type Tab = 'overview' | 'cleanup'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: '健康度 + 列表' },
  { key: 'cleanup', label: '清理 + 抽查' },
]

const KIND_FILTERS: { key: FewShotKind | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'hook', label: 'hook' },
  { key: 'section', label: 'section' },
  { key: 'outro', label: 'outro' },
  { key: 'rhythm', label: 'rhythm' },
]

const PAGE_SIZE = 50

export function FewShotPool() {
  const [tab, setTab] = useState<Tab>('overview')

  // 健康度 30s 自动刷新
  const healthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const healthState = useApi(getPoolHealth, 'pool-health')
  useEffect(() => {
    healthTimerRef.current = setInterval(() => healthState.reload(), 30_000)
    return () => {
      if (healthTimerRef.current) clearInterval(healthTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <h1 className={pageTitleClass}>听感池</h1>
      <p className={pageHintClass}>
        数据源：GET /api/v1/admin/few-shot-pool/health · /few-shot-pool · /audit-sample · /cleanup · /audit-result
      </p>

      <div className="mt-5">
        <SlidingTabs items={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'overview' ? (
        <OverviewTab healthState={healthState} />
      ) : (
        <PoolAuditWorkflow />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   健康度 + 列表 tab
───────────────────────────────────────────────────────── */

function OverviewTab({
  healthState,
}: {
  healthState: ReturnType<typeof useApi<Awaited<ReturnType<typeof getPoolHealth>>>>
}) {
  const [kind, setKind] = useState<FewShotKind | 'all'>('all')
  const [minScore, setMinScore] = useState('')
  const [activeOnly, setActiveOnly] = useState(true)
  const [page, setPage] = useState(0)

  const filterKey = useMemo(
    () => `${kind}|${minScore}|${activeOnly}|${page}`,
    [kind, minScore, activeOnly, page],
  )

  const listState = useApi(
    () =>
      listPool({
        kind: kind === 'all' ? undefined : kind,
        min_score: minScore ? Number(minScore) : undefined,
        active: activeOnly,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    filterKey,
  )

  // 过滤变更 → 回到第一页
  useEffect(() => {
    setPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, minScore, activeOnly])

  return (
    <div className="mt-6 space-y-6">
      {healthState.error && (
        <ErrorNotice
          message={healthState.error}
          missing={healthState.missing}
          onRetry={healthState.reload}
        />
      )}

      <PoolHealthCard data={healthState.data} loading={healthState.loading} />

      {/* 列表区 */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
            池条目
          </h2>
          <div className="text-xs text-neutral-400 dark:text-neutral-500">
            GET /admin/few-shot-pool
          </div>
        </div>

        {/* 过滤栏 */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="t-tabs" role="tablist" aria-label="kind 过滤">
            {KIND_FILTERS.map((k) => (
              <button
                key={k.key}
                type="button"
                role="tab"
                aria-selected={kind === k.key}
                onClick={() => setKind(k.key)}
                className="t-tab"
              >
                {k.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            最低分
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="0-5"
              className={`${inputClass} w-20 py-1 text-xs`}
            />
          </label>

          <label className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            仅活跃
          </label>

          <button
            type="button"
            className={`${buttonGhostClass} ml-auto flex items-center gap-1.5 text-xs`}
            onClick={listState.reload}
          >
            <RefreshCw size={12} />
            刷新
          </button>
        </div>

        {listState.error && (
          <ErrorNotice
            message={listState.error}
            missing={listState.missing}
            onRetry={listState.reload}
          />
        )}

        <div className={tableWrapClass}>
          <table className="w-full text-sm">
            <thead className={theadClass}>
              <tr>
                <th className={thClass}>kind</th>
                <th className={thClass}>id</th>
                <th className={thClass}>score</th>
                <th className={thClass}>usage</th>
                <th className={thClass}>rewrite_text</th>
                <th className={thClass}>last_used</th>
                <th className={thClass}>active</th>
              </tr>
            </thead>
            <tbody>
              {listState.loading && !listState.data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={rowClass}>
                    <td colSpan={7} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : !listState.data || listState.data.items.length === 0 ? (
                <EmptyRow colSpan={7} text="无匹配条目" />
              ) : (
                listState.data.items.map((item) => (
                  <PoolRow key={item.id} item={item} />
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          total={listState.data?.total ?? 0}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      </div>
    </div>
  )
}

function PoolRow({ item }: { item: PoolExample }) {
  const scoreTone =
    item.score_avg >= 4
      ? 'text-success'
      : item.score_avg >= 3
        ? 'text-warning'
        : 'text-error'

  return (
    <tr className={rowClass}>
      <td className={cellTextClass}>
        <Badge value={item.kind} />
      </td>
      <td className={cellMutedClass}>
        <span className="font-mono text-xs">{item.id}</span>
      </td>
      <td className={cellStrongClass}>
        <span className={scoreTone}>{item.score_avg.toFixed(2)}</span>
      </td>
      <td className={cellTextClass}>{item.usage_count}</td>
      <td className={cellTextClass}>
        <span className="line-clamp-2">{item.rewrite_text}</span>
      </td>
      <td className={cellMutedClass}>{formatTime(item.last_used_at)}</td>
      <td className={cellTextClass}>
        <Badge value={item.active ? 'active' : 'inactive'} />
      </td>
    </tr>
  )
}

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number
  total: number
  pageSize: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className={`${footerCountClass} flex items-center justify-between`}>
      <span>
        共 {total} 条 · 第 {page + 1} / {totalPages} 页
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={buttonGhostClass}
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          aria-label="上一页"
        >
          <ChevronLeft size={12} />
        </button>
        <button
          type="button"
          className={buttonGhostClass}
          onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          aria-label="下一页"
        >
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

export default FewShotPool