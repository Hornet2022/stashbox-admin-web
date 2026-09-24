import { apiClient, unwrap, type ListResult } from './_shared'
import type { PushNotificationRow } from '../../types'

/**
 * 推送队列端点 —— GET /api/v1/notifications（user-service，CP5.4a）。
 *
 * ⚠️ 2026-09-24 回归修正：CP-NEW.15 拆分时误把路径写成
 * /api/v1/admin/push-notifications（后端不存在 → 404）。老 admin.ts 的
 * 正确路径是 /api/v1/notifications，此处恢复。
 *
 * ⚠️ 已知产品缺口（非前端 bug）：该端点是**用户侧**实现 ——
 * require_user + 只返回当前登录者自己的推送（JWT sub），
 * 参数只有 unread_only/limit，无跨用户查询、无 status 过滤、无分页 total。
 * 响应形态 {notifications: [...], unread_count} 在此手动归一化
 * （normalizeList 不识别 notifications 键）。
 * admin 全量推送队列视图需要后端新增真正的 /admin/push-notifications 端点，
 * 已记入待办（见 PushNotifications.tsx 页头提示）。
 */

export async function listPushNotifications(params: {
  page?: number
  size?: number
  status?: string
} = {}): Promise<ListResult<PushNotificationRow>> {
  const { data } = await apiClient.get('/api/v1/notifications', { params })
  const payload = unwrap<{ notifications?: PushNotificationRow[] }>(data)
  const items = payload?.notifications ?? []
  return { items, total: items.length }
}