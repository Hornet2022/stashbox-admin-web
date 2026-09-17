import { useState, type FormEvent } from 'react'
import { listAuditLog } from '../api/admin'
import { useApi } from '../hooks/useApi'
import {
  EmptyRow,
  ErrorNotice,
  Field,
  Loading,
  buttonGhostClass,
  buttonPrimaryClass,
  formatTime,
  inputClass,
} from '../components/ui'

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

  const rows = data?.items ?? []

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">审计日志</h1>
      <p className="mt-1 text-sm text-gray-500">
        数据源：GET /api/v1/admin/audit-log
      </p>

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

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <Loading colSpan={columns.length} />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={columns.length}
                text={error ? '数据不可用' : '暂无日志记录'}
              />
            ) : (
              rows.map((log) => (
                <tr key={log.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-500">{log.id}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.actor_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {log.action_type ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.target_type ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.target_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatTime(log.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">共 {data?.total ?? rows.length} 条</p>
      )}
    </div>
  )
}

export default AuditLog
