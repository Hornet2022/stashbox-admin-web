import { apiClient, normalizeList, unwrap, type ListResult } from './_shared'
import type { PushNotificationRetryResult, PushNotificationRow } from '../../types'

/**
 * 推送队列端点 —— GET /api/v1/admin/push-notifications + POST .../retry。
 *
 * 后端落地（v1 §端点需求_admin推送队列_v1.md，alembic 0031）：
 * - 鉴权 require_admin_or_operator；只读查询不写审计
 * - 参数 status(pending|sent|failed，非法值 400) / user_id / tag_slug / limit(cap 200) / offset
 * - 响应 {total, limit, offset, items}，排序 created_at DESC
 * - retry 仅 status=failed 可用，reason 5-200 字符写审计
 *
 * 历史：拆分期曾误写路径（cp-new-23/24 修正），更早借道用户侧
 * /api/v1/notifications（只回当前登录者自己的推送，非 admin 视图）。
 */

export async function listPushNotifications(params: {
  status?: string
  user_id?: number
  tag_slug?: string
  limit?: number
  offset?: number
} = {}): Promise<ListResult<PushNotificationRow>> {
  const { data } = await apiClient.get('/api/v1/admin/push-notifications', { params })
  return normalizeList<PushNotificationRow>(data)
}

/** POST /api/v1/admin/push-notifications/{id}/retry —— 仅 failed 可重推 */
export async function retryPushNotification(
  notificationId: number,
  reason: string,
): Promise<PushNotificationRetryResult> {
  const { data } = await apiClient.post(
    `/api/v1/admin/push-notifications/${notificationId}/retry`,
    { reason },
  )
  return unwrap<PushNotificationRetryResult>(data)
}