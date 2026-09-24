import { apiClient, unwrap } from './_shared'
import type { ABReport } from '../../types'

/**
 * A4 · A/B 实验报表（接口文档 §2.2）
 *
 * 挂 ai-service（8103），鉴权 require_admin_or_operator。
 * 分组口径（intention-to-treat）：user_id % 100 < 30 → personalized；其余 general
 * 0029 上线前数据 ab_group=NULL → pre_experiment
 *
 * ⚠️ 结论有效性硬约束：报表口径从 0029 部署日起算 —— UI caveats 必须展示。
 * 无数据的指标为 null（分母为 0 时不硬算 0）。
 */

/** GET /api/v1/admin/ab-report?date_from=&date_to=（可都不传 = 全量） */
export async function getAbReport(params: {
  date_from?: string
  date_to?: string
} = {}): Promise<ABReport> {
  const { data } = await apiClient.get('/api/v1/admin/ab-report', { params })
  return unwrap<ABReport>(data)
}