import { apiClient } from '../client'
import { normalizeList, type ListResult } from './_shared'
import type { AuditLogRow } from '../../types'

/**
 * 审计日志端点 —— GET /api/v1/admin/audit-log。
 *
 * 仅返回结构化字段（actor_id / action_type / target_type / target_id / created_at）。
 * 自由文本 metadata 在 admin 端不回显（与端点文档 §2.2 约定一致）。
 *
 * CP-NEW.15：从老 api/admin.ts 拆出。
 */

export async function listAuditLog(params: {
  page?: number
  size?: number
  actor_id?: number | string
  action_type?: string
  from?: string
  to?: string
} = {}): Promise<ListResult<AuditLogRow>> {
  const { data } = await apiClient.get('/api/v1/admin/audit-log', { params })
  return normalizeList<AuditLogRow>(data)
}