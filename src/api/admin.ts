import apiClient, { ADMIN_API_PREFIX, API_BASE_URL, getAuthToken } from './client'
import type {
  ArticleRow,
  AuditLogRow,
  DashboardStats,
  ListResult,
  PageParams,
  PushNotificationRow,
  TagRow,
  UserRow,
} from '../types'

/**
 * admin API 客户端（CP-ADMIN-2）。
 *
 * 所有函数都返回已归一化的数据（剥掉 {code,message,data} 包装、
 * 统一分页字段），页面侧不需要关心后端包装形态。
 *
 * 端点未上线时 axios 会抛错（404 / 网络不可达），由页面统一渲染
 * “功能待上线”，不阻塞其他页面。
 */

/** 剥掉 api-gateway 的 {code,message,data} 包装 */
function unwrap<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    ('code' in payload || 'message' in payload)
  ) {
    return (payload as { data: T }).data
  }
  return payload as T
}

/** 分页响应归一化：兼容数组 / items / list / records 四种形态 */
function normalizeList<T>(payload: unknown): ListResult<T> {
  const data = unwrap<unknown>(payload)

  if (Array.isArray(data)) {
    return { items: data as T[], total: data.length }
  }

  if (data && typeof data === 'object') {
    const obj = data as {
      items?: T[]
      list?: T[]
      records?: T[]
      total?: number
      count?: number
    }
    const items = obj.items ?? obj.list ?? obj.records ?? []
    return { items, total: obj.total ?? obj.count ?? items.length }
  }

  return { items: [], total: 0 }
}

/* ---------------------------------- 用户 --------------------------------- */

export async function listUsers(
  params: {
    page?: number
    size?: number
    keyword?: string
    tier?: string
    status?: string
  } = {},
): Promise<ListResult<UserRow>> {
  const { data } = await apiClient.get('/api/v1/admin/users', { params })
  return normalizeList<UserRow>(data)
}

/** POST /api/v1/admin/users/{id}/quota-adjust */
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

/* ---------------------------------- 文章 --------------------------------- */

/** 复用用户端文章列表 API */
export async function listArticles(
  params: {
    page?: number
    size?: number
    status?: string
    tag?: string
  } = {},
): Promise<ListResult<ArticleRow>> {
  const { data } = await apiClient.get('/api/v1/articles', { params })
  return normalizeList<ArticleRow>(data)
}

/** POST /api/v1/admin/articles/{id}/force-retry */
export async function forceRetryArticle(
  articleId: string | number,
  reason: string,
): Promise<void> {
  await apiClient.post(`/api/v1/admin/articles/${articleId}/force-retry`, {
    reason,
  })
}

/** POST /api/v1/admin/audio/{id}/invalidate */
export async function invalidateAudio(
  audioId: string | number,
  reason: string,
): Promise<void> {
  await apiClient.post(`/api/v1/admin/audio/${audioId}/invalidate`, { reason })
}

/* ---------------------------------- 标签 --------------------------------- */

export async function listTags(): Promise<ListResult<TagRow>> {
  const { data } = await apiClient.get('/api/v1/tags')
  return normalizeList<TagRow>(data)
}

export async function createTag(
  name: string,
  description?: string,
): Promise<void> {
  await apiClient.post('/api/v1/tags', { name, description })
}

/* --------------------------------- 推送队列 ------------------------------- */

export async function listPushNotifications(
  params: { page?: number; status?: string } = {},
): Promise<ListResult<PushNotificationRow>> {
  const { data } = await apiClient.get('/api/v1/notifications', { params })
  return normalizeList<PushNotificationRow>(data)
}

/* --------------------------------- 审计日志 ------------------------------- */

export async function listAuditLog(
  params: {
    page?: number
    size?: number
    actor_id?: number | string
    action_type?: string
  } = {},
): Promise<ListResult<AuditLogRow>> {
  const { data } = await apiClient.get('/api/v1/admin/audit-log', { params })
  return normalizeList<AuditLogRow>(data)
}

/* --------------------------------- Dashboard ----------------------------- */

export async function getStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get('/api/v1/admin/stats')
  const stats = unwrap<Partial<DashboardStats>>(data)
  return {
    total_users: stats?.total_users ?? 0,
    total_articles: stats?.total_articles ?? 0,
    total_distilled: stats?.total_distilled ?? 0,
    active_audio_files: stats?.active_audio_files ?? 0,
    failed_distillations_24h: stats?.failed_distillations_24h ?? 0,
  }
}

/* --------------------------------- CSV 导出 -------------------------------- */

/** CP5.6 后端提供的 4 个导出端点（GET /api/v1/admin/export/{kind}.csv） */
export type ExportKind = 'users' | 'articles' | 'tags' | 'audit-log'

/**
 * 拼 CSV 导出直链。
 *
 * 走 `window.location.href` 触发浏览器原生下载，不经过 axios
 * （避免把 CSV 当 JSON 解析）。cookie 鉴权由浏览器自动带上，
 * 另外附 token 查询参数兼容纯 token 场景。
 */
export function exportCsvUrl(kind: ExportKind): string {
  const token = getAuthToken()
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${API_BASE_URL}${ADMIN_API_PREFIX}/export/${kind}.csv${query}`
}

/** 触发下载（返回实际使用的 URL，便于测试 / 断言） */
export function downloadCsv(kind: ExportKind): string {
  const url = exportCsvUrl(kind)
  window.location.href = url
  return url
}

export type { PageParams }
