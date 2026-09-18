import { useState, type FormEvent } from 'react'
import { downloadCsv, listAuditLog } from '../api/admin'
import { useApi } from '../hooks/useApi'
import { toast } from '../store/toast'
import {
  EmptyRow,
  ErrorNotice,
  Field,
  TableSkeleton,
  buttonGhostClass,
  buttonPrimaryClass,
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

/**
 * 审计日志页 —— GET /api/v1/admin/audit-log（actor_id + action_type 过滤）。
 */

const columns = ['ID', '操作人 ID', '动作', '对象类型', '对象 ID', '时间']

export function AuditLog() {
  const [actorDraft, setActorDraft] = useState('')
  const [actionDraft, setActionDraft] = useState('')
  const [actorId, setActorId] = useState('')
  const [actionType, setActionType] = useState('')

  const queryKey = `${actorId}|${actionType}`
  const { data, loading, error, missing, reload } = useApi(
    () =>
      listAuditLog({
        actor_id: actorId || undefined,
        action_type: actionType || undefined,
        page: 1,
        size: 50,
      }),
    queryKey,
  )

  const handleFilter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setActorId(actorDraft.trim())
    setActionType(actionDraft.trim())
  }

  /** CSV 导出：走 window.location 触发浏览器原生下载 */
  const handleExport = () => {
    toast('正在导出审计日志 CSV…', 'info')
    downloadCsv('audit-log')
  }

  const rows = data?.items ?? []

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={pageTitleClass}>审计日志</h1>
          <p className={pageHintClass}>数据源：GET /api/v1/admin/audit-log</p>
        </div>
        <button type="button" className={buttonGhostClass} onClick={handleExport}>
          导出 CSV
        </button>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={handleFilter}>
        <div className="w-44">
          <Field label="操作人 ID">
            <input
              type="text"
              value={actorDraft}
              onChange={(e) => setActorDraft(e.target.value)}
              placeholder="如 1"
              className={inputClass}
            />
          </Field>
        </div>
        <div className="w-56">
          <Field label="动作类型">
            <input
              type="text"
              value={actionDraft}
              onChange={(e) => setActionDraft(e.target.value)}
              placeholder="如 quota_adjust"
              className={inputClass}
            />
          </Field>
        </div>
        <button type="submit" className={buttonPrimaryClass}>
          过滤
        </button>
        <button
          type="button"
          className={buttonGhostClass}
          onClick={() => {
            setActorDraft('')
            setActionDraft('')
            setActorId('')
            setActionType('')
          }}
        >
          重置
        </button>
        <button type="button" className={buttonGhostClass} onClick={reload}>
          刷新
        </button>
      </form>

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
                text={error ? '数据不可用' : '暂无日志记录'}
              />
            ) : (
              rows.map((log) => (
                <tr key={log.id} className={rowClass}>
                  <td className={cellMutedClass}>{log.id}</td>
                  <td className={cellTextClass}>{log.actor_id ?? '—'}</td>
                  <td className={cellStrongClass}>{log.action_type ?? '—'}</td>
                  <td className={cellTextClass}>{log.target_type ?? '—'}</td>
                  <td className={cellTextClass}>{log.target_id ?? '—'}</td>
                  <td className={`${cellMutedClass} whitespace-nowrap`}>
                    {formatTime(log.created_at)}
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

export default AuditLog
