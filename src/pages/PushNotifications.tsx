import { useState, useRef, useEffect } from 'react'
import { listPushNotifications } from '../api/admin'
import { useApi } from '../hooks/useApi'
import {
  Badge,
  EmptyRow,
  ErrorNotice,
  TableSkeleton,
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
import { formatTime } from '../utils'

/**
 * 推送队列页 —— GET /api/v1/notifications（状态 tab 过滤）。
 */

const columns = ['ID', '用户 ID', '标题', '内容', '状态', '创建时间']

const TABS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待发送' },
  { key: 'sent', label: '已发送' },
  { key: 'failed', label: '失败' },
]

export function PushNotifications() {
  const [status, setStatus] = useState('')
  const tabsRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)

  const { data, loading, error, missing, reload } = useApi(
    () => listPushNotifications({ status: status || undefined, page: 1 }),
    status,
  )

  // Tabs pill orchestration
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
  }, [])

  const handleTabClick = (tab: { key: string; label: string }) => {
    setStatus(tab.key)
    // Move pill after state update
    requestAnimationFrame(() => movePill(true))
  }

  const rows = data?.items ?? []

  return (
    <div>
      <h1 className={pageTitleClass}>推送队列</h1>
      <p className={pageHintClass}>数据源：GET /api/v1/notifications</p>

      {/* 状态 tab — transitions.dev t-tabs */}
      <div className="mt-6 flex items-center gap-2">
        <div ref={tabsRef} className="t-tabs" role="tablist">
          <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
          {TABS.map((tab) => {
            const active = status === tab.key
            return (
              <button
                key={tab.key || 'all'}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleTabClick(tab)}
                className="t-tab"
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className={`ml-auto ${buttonGhostClass}`}
          onClick={reload}
          aria-label="刷新推送列表"
        >
          刷新
        </button>
      </div>

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      <div className={tableWrapClass}>
        <table className="w-full text-left text-sm">
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
                  <td className={cellMutedClass}>{item.user_id ?? '—'}</td>
                  <td className={`${cellStrongClass} max-w-xs truncate`}>
                    {item.title ?? '—'}
                  </td>
                  <td className={`${cellTextClass} max-w-md truncate`}>
                    {item.body ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={item.status} />
                  </td>
                  <td className={`${cellMutedClass} whitespace-nowrap`}>
                    {formatTime(item.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className={footerCountClass}>共 {data?.total ?? rows.length} 条</p>
      )}
    </div>
  )
}

export default PushNotifications
