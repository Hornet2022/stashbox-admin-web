import { apiClient } from '../client'
import { normalizeList, type ListResult } from './_shared'
import type { TagRow } from '../../types'

/**
 * 标签管理端点 —— GET /tags + POST /tags + DELETE /tags/{id}。
 *
 * CP-NEW.15：从老 api/admin.ts 拆出。
 */

export async function listTags(params: {
  page?: number
  size?: number
} = {}): Promise<ListResult<TagRow>> {
  const { data } = await apiClient.get('/api/v1/admin/tags', { params })
  return normalizeList<TagRow>(data)
}

export async function createTag(
  name: string,
  description?: string,
): Promise<{ id: number; name: string }> {
  const { data } = await apiClient.post('/api/v1/admin/tags', { name, description })
  return data as { id: number; name: string }
}

export async function deleteAdminTag(tagId: number, reason: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/tags/${tagId}`, { data: { reason } })
}