/**
 * 用户管理页骨架（GET /api/v1/admin/users）。
 *
 * ⚠️ 占位表格，无数据、无请求。
 */
const columns = [
  'ID',
  '邮箱',
  '昵称',
  '状态',
  '配额',
  '已用',
  '文章数',
  '注册时间',
]

export function Users() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
      <p className="mt-1 text-sm text-gray-500">
        数据源：GET /api/v1/admin/users（CP-ADMIN-2 接线）
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
                暂无数据（CP-ADMIN-2 接 users 接口后填充）
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Users
