/**
 * 总览页骨架（GET /api/v1/admin/stats）。
 *
 * ⚠️ 占位卡片，数值写死，不调接口。
 */
const statCards = [
  { label: '用户总数', value: '—' },
  { label: '活跃用户', value: '—' },
  { label: '文章总数', value: '—' },
  { label: '待处理文章', value: '—' },
  { label: '标签总数', value: '—' },
  { label: '待推送', value: '—' },
]

export function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">总览</h1>
      <p className="mt-1 text-sm text-gray-500">
        数据源：GET /api/v1/admin/stats（CP-ADMIN-2 接线）
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 bg-white p-5"
          >
            <div className="text-sm text-gray-500">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {card.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
