import { Badge, EmptyRow, TableSkeleton, buttonGhostClass, cellMutedClass, cellStrongClass, cellTextClass, footerCountClass, rowClass, tableWrapClass, thClass, theadClass } from '../../components/ui'
import { formatNumber, formatTime } from '../../utils'
import { COLUMNS } from './constants'
import type { UserRow } from '../../types'

/**
 * 用户管理表格 —— 每行可点击"调整配额"打开 Modal。
 */
export interface UsersTableProps {
  rows: UserRow[]
  total: number | undefined
  loading: boolean
  hasError: boolean
  onAdjust: (user: UserRow) => void
}

export function UsersTable({ rows, total, loading, hasError, onAdjust }: UsersTableProps) {
  return (
    <>
      <div className={tableWrapClass}>
        <table className="w-full text-left text-sm">
          <thead className={theadClass}>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col} scope="col" className={thClass}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton colSpan={COLUMNS.length} rows={5} />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={COLUMNS.length}
                text={hasError ? '数据不可用' : '暂无用户数据'}
              />
            ) : (
              rows.map((user) => (
                <tr key={user.id} className={rowClass}>
                  <td className={cellMutedClass}>{user.id}</td>
                  <td className={cellStrongClass}>{user.email}</td>
                  <td className={cellTextClass}>{user.display_name ?? '—'}</td>
                  <td className={cellTextClass}>{user.role ?? '—'}</td>
                  <td className={cellTextClass}>{user.tier ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge value={user.status} />
                  </td>
                  <td className={cellTextClass}>{formatNumber(user.monthly_quota)}</td>
                  <td className={cellTextClass}>{formatNumber(user.used_quota)}</td>
                  <td className={`${cellMutedClass} whitespace-nowrap`}>
                    {formatTime(user.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onAdjust(user)}
                      className={buttonGhostClass}
                    >
                      调整配额
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className={footerCountClass}>共 {formatNumber(total)} 条</p>
      )}
    </>
  )
}