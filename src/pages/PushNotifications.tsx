import { useState } from 'react'
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
  formatTime,
  pageHintClass,
  pageTitleClass,
  rowClass,
  tableWrapClass,
  thClass,
  theadClass,
} from '../components/ui'

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

  const { data, loading, error, missing, reload } = useApi(
    () => listPushNotifications({ status: status || undefined, page: 1 }),
    status,
  )

  const rows = data?.items ?? []

  return (
    <div>
      <h1 className={pageTitleClass}>推送队列</h1>
      <p className={pageHintClass}>数据源：GET /api/v1/notifications</p>

      {/* 状态 tab */}
      <div className="mt-6 flex items-center gap-2 border-b border-gray-200 dark:border-slate-700">
        {TABS.map((tab) => {
          const active = status === tab.key
          return (
            <button
              key={tab.key || 'all'}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
                active
                  ? 'border-slate-800 font-medium text-slate-900 dark:border-slate-200 dark:text-slate-100'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
        <button
          type="button"
          className={`ml-auto ${buttonGhostClass}`}
          onClick={reload}
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
                <th key={col} className={thClass}>
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
