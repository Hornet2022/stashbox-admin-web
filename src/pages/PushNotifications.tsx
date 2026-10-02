import { useEffect, useMemo, useRef, useState } from 'react'
import { listPushNotifications, retryPushNotification } from '../api/admin'
import { useApi } from '../hooks/useApi'
import { useRole, hasPermission } from '../hooks/useRole'
import { toast } from '../store/toast'
import {
  Badge,
  EmptyRow,
  ErrorNotice,
  ReasonDialog,
  TableSkeleton,
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
import type { PushNotificationRow } from '../types'
import { PUSH_STATUS_LABELS } from '../constants/labels'

/**
 * 推送队列页 —— GET /api/v1/admin/push-notifications（v1 需求文档落地版）。
 *
 * - 状态 tab（pending/sent/failed）真实生效
 * - user_id / tag_slug 过滤 + limit/offset 分页
 * - failed 行可重推（POST .../retry，reason ≥5 写审计）
 * - admin / operator 可重推；其余角色只读
 */

const columns = ['ID', '用户 ID', '标题', '内容', '状态', '失败原因', '创建时间', '发送时间', '操作']

const TABS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待发送' },
  { key: 'sent', label: '已发送' },
  { key: 'failed', label: '失败' },
] as const

const PAGE_SIZE = 50

export function PushNotifications() {
  const role = useRole()
  const canOperate = hasPermission(role, ['super_admin', 'operator'])

  const [status, setStatus] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [appliedUserId, setAppliedUserId] = useState('')
  const [page, setPage] = useState(0)
  const tabsRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)

  const queryKey = useMemo(
    () => `${status}|${appliedUserId}|${page}`,
    [status, appliedUserId, page],
  )

  const { data, loading, error, missing, reload } = useApi(
    () =>
      listPushNotifications({
        status: status || undefined,
        user_id: appliedUserId ? Number(appliedUserId) : undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    queryKey,
  )

  // 过滤变更回第一页
  useEffect(() => {
    setPage(0)
  }, [status, appliedUserId])

  // Tabs pill orchestration（沿用 transitions.dev t-tabs）
  const movePill = (animate: boolean) => {
    const bar = tabsRef.current
    const pill = pillRef.current
    if (!bar || !pill) return
    const tabs = [...bar.querySelectorAll<HTMLButtonElement>('.t-tab')]
    const active = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]
    if (!active) return
    if (!animate) {
      const prev = pill.style.transition
      pill.style.transition = 'none'
      pill.style.transform = `translateX(${active.offsetLeft}px)`
      pill.style.width = `${active.offsetWidth}px`
      void pill.offsetWidth
      pill.style.transition = prev
    } else {
      pill.style.transform = `translateX(${active.offsetLeft}px)`
      pill.style.width = `${active.offsetWidth}px`
    }
  }

  useEffect(() => {
    movePill(false)
    const t = setTimeout(() => movePill(true), 50)
    return () => clearTimeout(t)
  }, [status])

  // —— retry 工作流 ——
  const [retryTarget, setRetryTarget] = useState<PushNotificationRow | null>(null)
  const [retrySubmitting, setRetrySubmitting] = useState(false)

  const handleRetry = async (reason: string) => {
    if (!retryTarget) return
    setRetrySubmitting(true)
    try {
      const result = await retryPushNotification(retryTarget.id, reason)
      toast(`已重推 #${result.id}（状态 ${result.status}）`, result.status === 'sent' ? 'success' : 'info')
      setRetryTarget(null)
      reload()
    } catch {
      // 拦截器已 toast
    } finally {
      setRetrySubmitting(false)
    }
  }

  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <h1 className={pageTitleClass}>推送队列</h1>
      <p className={pageHintClass}>
        待发送的站内推送，按创建时间倒序
      </p>

      {/* 状态 tab + 过滤 */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div ref={tabsRef} className="t-tabs" role="tablist" aria-label="推送状态过滤">
          <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
          {TABS.map((tab) => (
            <button
              key={tab.key || 'all'}
              type="button"
              role="tab"
              aria-selected={status === tab.key}
              onClick={() => setStatus(tab.key)}
              className="t-tab"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          user_id
          <input
            type="number"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setAppliedUserId(userIdFilter.trim())
            }}
            onBlur={() => setAppliedUserId(userIdFilter.trim())}
            placeholder="按接收者过滤"
            className={`${inputClass} w-36 py-1 text-xs`}
          />
        </label>

        <button
          type="button"
          className={`${buttonGhostClass} ml-auto`}
          onClick={reload}
          aria-label="刷新推送列表"
        >
          刷新
        </button>
      </div>

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      <div className={tableWrapClass}>
        <table className="w-full min-w-max text-left text-sm">
          <thead className={theadClass}>
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col" className={thClass}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton colSpan={columns.length} rows={5} />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={columns.length}
                text={error ? '数据不可用' : '暂无推送任务'}
              />
            ) : (
              rows.map((item) => (
                <tr key={item.id} className={rowClass}>
                  <td className={cellMutedClass}>{item.id}</td>
                  <td className={cellMutedClass}>{item.user_id}</td>
                  <td className={`${cellStrongClass} max-w-xs truncate`}>{item.title}</td>
                  <td className={`${cellTextClass} max-w-md truncate`}>{item.body}</td>
                  <td className="px-4 py-3">
                    <Badge value={item.status} map={PUSH_STATUS_LABELS} />
                  </td>
                  <td className={`${cellTextClass} max-w-xs truncate`}>
                    <span className={item.error ? 'text-error' : undefined} title={item.error ?? undefined}>
                      {item.error ?? '—'}
                    </span>
                  </td>
                  <td className={`${cellMutedClass} whitespace-nowrap`}>
                    {formatTime(item.created_at)}
                  </td>
                  <td className={`${cellMutedClass} whitespace-nowrap`}>
                    {formatTime(item.sent_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {item.status === 'failed' && canOperate ? (
                      <button
                        type="button"
                        className={buttonGhostClass}
                        onClick={() => setRetryTarget(item)}
                        aria-label={`重推推送 ${item.id}`}
                      >
                        重推
                      </button>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className={`${footerCountClass} flex items-center justify-between`}>
        <span>
          共 {total} 条 · 第 {page + 1} / {totalPages} 页
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={buttonGhostClass}
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            aria-label="上一页"
          >
            上一页
          </button>
          <button
            type="button"
            className={buttonGhostClass}
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            aria-label="下一页"
          >
            下一页
          </button>
        </div>
      </div>

      <ReasonDialog
        open={retryTarget !== null}
        title={`重推失败推送 · #${retryTarget?.id ?? ''}`}
        description={
          retryTarget
            ? `「${retryTarget.title}」→ 用户 ${retryTarget.user_id}；上次错误：${retryTarget.error ?? '未知'}。reason 写入审计日志（≥5 字符）。`
            : ''
        }
        confirmLabel="确认重推"
        confirmTone="primary"
        submitting={retrySubmitting}
        onClose={() => setRetryTarget(null)}
        onConfirm={handleRetry}
      />
    </div>
  )
}

export default PushNotifications