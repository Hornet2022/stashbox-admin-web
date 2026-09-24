import apiClient, { ADMIN_API_PREFIX, API_BASE_URL, getAuthToken } from './client'
import type {
  ArticleRow,
  AuditLogRow,
  DashboardStats,
  DistillP95Response,
  LlmConfig,
  LlmTestResult,
  ListResult,
  PageParams,
  PushNotificationRow,
  TagRow,
  TtsConfig,
  TtsTestResult,
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
      tags?: T[]
      total?: number
      count?: number
    }
    const items = obj.items ?? obj.list ?? obj.records ?? obj.tags ?? []
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

/** CP9.x：admin 用全局端点 /api/v1/admin/articles（不按 JWT sub 过滤）
 * 旧版错调 /api/v1/articles（per-user 端点），admin 看不到其他用户文章
 */
export async function listArticles(
  params: {
    page?: number
    size?: number
    status?: string
    tag?: string
  } = {},
): Promise<ListResult<ArticleRow>> {
  const { data } = await apiClient.get('/api/v1/admin/articles', { params })
  return normalizeList<ArticleRow>(data)
}

/** POST /api/v1/articles 新建文章 */
export async function createArticle(
  url: string,
  source: string = 'url',
  title?: string,
): Promise<void> {
  await apiClient.post('/api/v1/articles', { url, source, title })
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

/**
 * CP-DELETE：DELETE /api/v1/admin/articles/{id}
 *
 * 硬删除：蒸馏结果 + 音频文件 + 收藏/稍后听/进度级联清理，配额不返还。
 * reason ≥5 字符（后端校验，写入审计日志）。axios delete 的 body 走 { data }。
 */
export async function deleteAdminArticle(
  articleId: string | number,
  reason: string,
): Promise<void> {
  await apiClient.delete(`/api/v1/admin/articles/${articleId}`, {
    data: { reason },
  })
}

/* ---------------------------------- 标签 --------------------------------- */

export async function listTags(): Promise<ListResult<TagRow>> {
  // CP-DELETE：改用 admin 专用端点（用户端 /api/v1/tags 的 id 是 slug、且无
  // is_system，无法驱动删除按钮与系统标签保护）。
  const { data } = await apiClient.get('/api/v1/admin/tags')
  return normalizeList<TagRow>(data)
}

export async function createTag(
  name: string,
  category: string = 'subject',
): Promise<void> {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 64) || 'tag'
  await apiClient.post('/api/v1/tags', { slug, name, category })
}

/**
 * CP-DELETE：DELETE /api/v1/admin/tags/{tagId}
 *
 * 系统标签（is_system）后端返 403；reason ≥5 字符必填，写审计日志。
 */
export async function deleteAdminTag(tagId: number, reason: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/tags/${tagId}`, {
    data: { reason },
  })
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
    from?: string
    to?: string
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

/* ----------------------------- 蒸馏耗时 P95 -------------------------------- */

export async function getDistillP95(): Promise<DistillP95Response> {
  const { data } = await apiClient.get('/api/v1/admin/distill-p95')
  return unwrap<DistillP95Response>(data)
}

/* --------------------------------- LLM 配置 -------------------------------- */

/**
 * LLM 配置端点 —— CP-PROXY-CONSOLIDATE：
 *
 * 历史注释（CP7.3）说 "/api/v1/admin/llm/* 还没挂进 api-gateway 路由表"，但实际
 * gateway config.py 已经注册了这 6 个端点（LLM/TTS × GET/PUT/TEST）。让 LLM 与
 * TTS 一样走默认 apiClient（gateway 8100），避免额外 baseURL 校验踩坑（axios 1.x
 * 对 baseURL='' 的处理在某些版本会抛 InvalidURL）。
 *
 * CP-TIMEOUT：LLM /test 走真 LLM API（阿里云 maas），平均 2-5s，15s 超时足够。
 */

/** GET /api/v1/admin/llm/config */
export async function getLlmConfig(): Promise<LlmConfig> {
  const { data } = await apiClient.get('/api/v1/admin/llm/config')
  return unwrap<LlmConfig>(data)
}

/** PUT /api/v1/admin/llm/config —— api_key 留空表示不改动已存的那把 key */
export async function updateLlmConfig(payload: {
  provider: string
  model: string
  api_key?: string
  base_url?: string
}): Promise<LlmConfig> {
  const { data } = await apiClient.put('/api/v1/admin/llm/config', payload)
  return unwrap<LlmConfig>(data)
}

/** GET /api/v1/admin/llm/test —— 用当前生效的 client 发一次 chat() */
export async function testLlm(): Promise<LlmTestResult> {
  const { data } = await apiClient.get('/api/v1/admin/llm/test')
  return unwrap<LlmTestResult>(data)
}

/* ---------------------------------- TTS --------------------------------- */
/* CP TTS-Config：admin TTS 配置。
   端点已挂进 api-gateway 路由表（content-service /api/v1/admin/tts/*），
   所以走默认 apiClient（gateway 8100），不需要单独的 baseURL。 */

/** PUT /api/v1/admin/tts/config 请求体。
 * 留空/不传的字段视作「不动」；显式传 null/"" 显式清空回落到 env（api_key/token 例外）。 */
export interface TtsConfigUpdatePayload {
  provider: string
  // edge
  edge_voice?: string | null
  // openai 协议
  openai_api_key?: string
  openai_base_url?: string | null
  openai_model?: string | null
  openai_voice?: string | null
  // doubao
  doubao_api_key?: string
  doubao_token?: string
  doubao_app_id?: string | null
  doubao_voice?: string | null
  doubao_resource_id?: string | null
  // local
  local_voice?: string | null
  ffmpeg_bin?: string | null
  // indextts
  indextts_base_url?: string | null
  indextts_model?: string | null
  indextts_ref_audio?: string | null
  indextts_ref_text?: string | null
}

/** GET /api/v1/admin/tts/config */
export async function getTtsConfig(): Promise<TtsConfig> {
  const { data } = await apiClient.get('/api/v1/admin/tts/config')
  return unwrap<TtsConfig>(data)
}

/** PUT /api/v1/admin/tts/config —— 热生效（落 system_config + reload factory） */
export async function updateTtsConfig(payload: TtsConfigUpdatePayload): Promise<TtsConfig> {
  const { data } = await apiClient.put('/api/v1/admin/tts/config', payload)
  return unwrap<TtsConfig>(data)
}

/** GET /api/v1/admin/tts/test —— 用当前 factory client 真合成一次 */
export async function testTts(): Promise<TtsTestResult> {
  const { data } = await apiClient.get('/api/v1/admin/tts/test')
  return unwrap<TtsTestResult>(data)
}

/* --------------------------------- CSV 导出 -------------------------------- */

/** CP5.6 后端提供的 6 个导出端点（GET /api/v1/admin/export/{kind}.csv） */
export type ExportKind = 'users' | 'articles' | 'tags' | 'audit-log' | 'feedback' | 'subscriptions'

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

/**
 * CP-NEW.1 —— 把新端点（A1-A8）拆到 `api/admin/*` 子模块。
 *
 * 通过 `export *` 把 barrel 全部 re-export，老 `import { ... } from '../api/admin'`
 * 调用方零修改即可拿到新端点封装。
 *
 * 老 entry 的旧逻辑（listUsers / listArticles / adjustQuota / listTags / createTag /
 * forceRetryArticle / invalidateAudio / deleteAdminArticle / deleteAdminTag /
 * listPushNotifications / listAuditLog / getStats / getDistillP95 /
 * getLlmConfig / updateLlmConfig / testLlm /
 * getTtsConfig / updateTtsConfig / testTts /
 * exportCsvUrl / downloadCsv）保留不动。
 */
export * from './admin'
