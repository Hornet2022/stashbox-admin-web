import { apiClient } from '../client'
import { normalizeList, type ListResult } from './_shared'
import type { PushNotificationRow } from '../../types'

/**
 * 推送队列端点 —— GET /api/v1/admin/push-notifications。
 *
 * CP-NEW.15：从老 api/admin.ts 拆出。
 */

export async function listPushNotifications(params: {
  page?: number
  size?: number
  status?: string
} = {}): Promise<ListResult<PushNotificationRow>> {
  const { data } = await apiClient.get('/api/v1/admin/push-notifications', { params })
  return normalizeList<PushNotificationRow>(data)
}