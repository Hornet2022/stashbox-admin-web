import { apiClient, normalizeList, type ListResult } from './_shared'
import type { ConsentRow } from '../../types'

/**
 * A7 · GDPR 同意抽查（接口文档 §2.2）
 *
 * 挂 ai-service（8103），鉴权 require_admin_or_operator。
 * 仅回显结构化字段（user_id / 两开关 / version / 时间），**不回显 comment 类自由文本**。
 * 本端点查询不写审计（只读）。
 */

/** GET /api/v1/admin/consents?personalization_enabled=&limit=&offset= —— 按 user_id 升序 */
export async function listConsents(params: {
  personalization_enabled?: boolean
  limit?: number
  offset?: number
} = {}): Promise<ListResult<ConsentRow>> {
  const { data } = await apiClient.get('/api/v1/admin/consents', { params })
  return normalizeList<ConsentRow>(data)
}