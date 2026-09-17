/**
 * 文章管理页骨架。
 *
 * 相关端点：POST /api/v1/admin/articles/{id}/force-retry
 *           POST /api/v1/admin/audio/{id}/invalidate
 *
 * ⚠️ 占位表格 + 占位操作按钮，不调接口。
 */
const columns = ['ID', '标题', '状态', '标签', '重试次数', '创建时间', '操作']

export function Articles() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">文章管理</h1>
      <p className="mt-1 text-sm text-gray-500">
        失败文章强制重试 / 音频失效（CP-ADMIN-2 接线）
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
                暂无数据（CP-ADMIN-2 接 articles 接口后填充）
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Articles
