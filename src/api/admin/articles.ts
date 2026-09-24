import { apiClient } from '../client'
import { normalizeList, type ListResult } from './_shared'
import type { ArticleRow } from '../../types'

/**
 * 文章管理端点 —— GET /admin/articles + 4 个 admin 写动作。
 *
 * CP-NEW.15 从老 api/admin.ts 拆出；2026-09-24 回归修正：
 * 拆分时曾把 4 个路径臆写成非 admin 形态（listArticles 丢了 /admin 段、
 * invalidate 用了复数 audios、delete/force-retry 走了用户侧前缀），
 * 现已逐字对齐老文件与网关 ROUTES 注册。
 */

export async function listArticles(params: {
  status?: string
  tag?: string
  page?: number
  size?: number
} = {}): Promise<ListResult<ArticleRow>> {
  const { data } = await apiClient.get('/api/v1/admin/articles', { params })
  return normalizeList<ArticleRow>(data)
}

export async function createArticle(
  url: string,
  source: 'url' | 'paste' = 'url',
  title?: string,
): Promise<void> {
  await apiClient.post('/api/v1/articles', {
    url,
    source,
    title,
  })
}

export async function forceRetryArticle(
  articleId: string | number,
  reason: string,
): Promise<void> {
  await apiClient.post(`/api/v1/admin/articles/${articleId}/force-retry`, { reason })
}

export async function invalidateAudio(
  audioId: string | number,
  reason: string,
): Promise<void> {
  await apiClient.post(`/api/v1/admin/audio/${audioId}/invalidate`, { reason })
}

export async function deleteAdminArticle(
  articleId: string | number,
  reason: string,
): Promise<void> {
  await apiClient.delete(`/api/v1/admin/articles/${articleId}`, { data: { reason } })
}