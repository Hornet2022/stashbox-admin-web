import { apiClient } from '../client'
import { normalizeList, type ListResult } from './_shared'
import type { UserRow } from '../../types'

/**
 * 用户管理端点 —— GET /api/v1/admin/users + POST /admin/users/{id}/quota-adjust。
 *
 * CP-NEW.15：从老 api/admin.ts 拆出。
 */

export async function listUsers(params: {
  keyword?: string
  tier?: string
  status?: string
  page?: number
  size?: number
} = {}): Promise<ListResult<UserRow>> {
  const { data } = await apiClient.get('/api/v1/admin/users', { params })
  return normalizeList<UserRow>(data)
}

export async function adjustQuota(
  userId: number,
  monthlyQuota: number,
  reason: string,
): Promise<void> {
  await apiClient.post(`/api/v1/admin/users/${userId}/quota-adjust`, {
    monthly_quota: monthlyQuota,
    reason,
  })
}