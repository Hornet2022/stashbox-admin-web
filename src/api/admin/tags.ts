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

export async function createTag(slug: string, name: string): Promise<{ id: number; name: string }> {
  // 网关注册的是 POST /api/v1/tags（CP3.6-A2，admin-web 复用用户侧创建入口）。
  // slug 是后端必填（TagCreateRequest: slug/name/category），原实现只传 name，
  // 导致新建标签**必然 422**。它不是可选的展示字段，是标识符。
  // 说明：曾经 UI 上还有「描述」输入框，但后端 Tag 模型 / 请求体 / 建表迁移里
  // 都没有 description 列 —— 填什么都不落库，已从 UI 移除，避免假装能保存。
  const { data } = await apiClient.post('/api/v1/tags', { slug, name })
  return data as { id: number; name: string }
}

export async function deleteAdminTag(tagId: number, reason: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/tags/${tagId}`, { data: { reason } })
}