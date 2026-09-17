/**
 * 审计日志页骨架（GET /api/v1/admin/audit-log）。
 *
 * ⚠️ 占位表格，无接口调用。
 */
const columns = ['ID', '操作人', '动作', '对象', '详情', 'IP', '时间']

export function AuditLog() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">审计日志</h1>
      <p className="mt-1 text-sm text-gray-500">
        数据源：GET /api/v1/admin/audit-log（CP-ADMIN-2 接线）
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-gray-400"
              >
                暂无日志记录
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AuditLog
