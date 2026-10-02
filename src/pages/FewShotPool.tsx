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
  pageHintClass,
  pageTitleClass,
  rowClass,
  tableWrapClass,
  thClass,
  theadClass,
} from '../components/ui'
import { POOL_ACTIVE_LABELS } from '../constants/labels'
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
        改写时参考的写作范例库。范例质量直接决定改写质量
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
          {/* 原来这里写的是接口路径（GET /admin/few-shot-pool），和页面标题
              「听感池」重复。换成当前筛选下的命中数 —— 运营调整过滤条件时
              需要立刻知道还剩多少条可抽查。 */}
          <div className="tnum text-xs text-neutral-400 dark:text-neutral-500">
            当前筛选 {listState.data?.items?.length ?? 0} 条
          </div>
        </div>

        {/* 过滤栏 */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* // 这里原来手写 <div className="t-tabs"> + 一串 .t-tab 按钮，但没有 .t-tabs-pill ——
             // 白色的滑动指示块（index.css:260）只存在于 PushNotifications 那一份手写副本里。
             // 结果是 4 个筛选 tab 里有 3 个没有选中指示：active 态只把字色从灰变黑，
             // 在一条灰底上肉眼几乎分不出来，用户会以为没点上而重复点击。
             // 改用仓库里本来就有的 SlidingTabs 原语，四处统一。 */}
          <SlidingTabs
            items={KIND_FILTERS}
            active={kind}
            onChange={(k) => setKind(k as typeof kind)}
          />

          {/* 原来这里是 `<label className="flex items-center gap-1.5">最低分
              <input className="{inputClass} w-20 …"></label>`，两个毛病：

              1) 裸文本是匿名 flex item，会被 input 挤到 min-content 宽，而
                 中文可以逐字断行 —— 窄屏下「最低分」被压成竖排的「最/低/
                 分」，白占三行高度；
              2) inputClass 自带 w-full，后面又跟一个 w-20。Tailwind 同属性
                 冲突，实际生效的那个取决于生成 CSS 的先后顺序，不可预期。

              改成：文字是独立 label 且不参与收缩；宽度直接写在 input 上，
              不再借用带 w-full 的 inputClass。 */}
          <div className="flex shrink-0 items-center gap-1.5">
            <label
              htmlFor="pool-min-score"
              className="shrink-0 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400"
            >
              最低分
            </label>
            <input
              id="pool-min-score"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="0-5"
              className="w-20 shrink-0 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-ink placeholder:text-neutral-400 focus:border-warm-ochre focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          <label className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="h-3.5 w-3.5 shrink-0"
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
                    {/* w-full 不带 min-w-max 时表格会被压进容器宽度里挤列：375px 下 7 列平均每列 49px，
          中文单元格会被挤成一两个字一行 —— 就是本仓库 f102934 修过的那个竖排。
          带 min-w-max 才是「保持自然宽度 + 横向滚动」，降级方式才对。
          仓库里已有 5 张表是这个写法，这里补齐。 */}
          <table className="w-full min-w-max text-sm">
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
      ? 'text-success-ink'
      : item.score_avg >= 3
        ? 'text-warning-ink'
        : 'text-error-ink'

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
        <Badge value={item.active ? 'active' : 'inactive'} map={POOL_ACTIVE_LABELS} />
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