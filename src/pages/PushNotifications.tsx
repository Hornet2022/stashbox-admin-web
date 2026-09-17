/**
 * 推送队列页骨架。
 *
 * ⚠️ 占位内容，无接口调用。
 */
const columns = [
  'ID',
  '标题',
  '状态',
  '目标数',
  '成功',
  '失败',
  '计划时间',
]

export function PushNotifications() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">推送队列</h1>
      <p className="mt-1 text-sm text-gray-500">
        推送任务状态跟踪（CP-ADMIN-2 接线）
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
                暂无推送任务
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PushNotifications
