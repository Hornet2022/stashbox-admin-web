/**
 * stashbox-admin-web 全局类型定义
 *
 * 字段以后端 v1 §3.6 admin 端点为参考（snake_case）。
 * 后端尚未上线的端点，字段按任务包约定先声明，实际响应有偏差时在
 * src/api/admin.ts 的 normalize 层做兼容。
 */

/** 统一后端响应包装（api-gateway 约定） */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** 分页请求参数 */
export interface PageParams {
  page?: number
  size?: number
}

/** 分页响应体（后端可能是 items / list / records 三种命名） */
export interface PageResult<T> {
  items?: T[]
  list?: T[]
  records?: T[]
  total?: number
  page?: number
  size?: number
  pageSize?: number
}

export type AdminRole = 'admin' | 'super_admin' | 'operator' | 'viewer'

/** GET /api/v1/admin/stats */
export interface DashboardStats {
  total_users: number
  total_articles: number
  total_distilled: number
  active_audio_files: number
  failed_distillations_24h: number
}

/** GET /api/v1/admin/users 行 */
export interface UserRow {
  id: number
  email: string
  display_name?: string
  role?: string
  tier?: string
  status?: string
  monthly_quota?: number
  used_quota?: number
  created_at?: string
}

/** GET /api/v1/articles 行（用户端文章列表 API，admin 复用） */
export interface ArticleRow {
  id: string | number
  title: string
  status?: string
  tags?: string[] | { id: number; name: string }[]
  quality_score?: number | null
  audio_id?: string | number | null
  created_at?: string
}

/** GET /api/v1/tags 行 */
export interface TagRow {
  id: number
  /** CP-DELETE：admin 端点（/api/v1/admin/tags）返回 slug/category/is_system */
  slug?: string
  category?: string
  is_system?: boolean
  name: string
  description?: string
  subscriber_count?: number
  created_at?: string
}

/** GET /api/v1/notifications 行 */
export interface PushNotificationRow {
  id: number
  user_id?: number
  title?: string
  body?: string
  status?: string
  created_at?: string
}

/** GET /api/v1/admin/audit-log 行 */
export interface AuditLogRow {
  id: number
  actor_id?: number
  action_type?: string
  target_type?: string
  target_id?: string | number | null
  created_at?: string
}

/** 列表查询结果（已归一化） */
export interface ListResult<T> {
  items: T[]
  total: number
}

/** GET / PUT /api/v1/admin/llm/config 响应（api_key 只吐 set/last4） */
export interface LlmConfig {
  provider: string
  model: string
  api_key_set: boolean
  api_key_last4?: string | null
  base_url?: string | null
  /** db = system_config 表里配了；env = 回落环境变量/默认值 */
  source?: string | null
  updated_at?: string | null
}

/** GET /api/v1/admin/llm/test 响应 */
export interface LlmTestResult {
  provider: string
  model?: string | null
  text?: string | null
  ok: boolean
  error?: string | null
}

/** GET / PUT /api/v1/admin/tts/config 响应（api_key 只吐 set/last4）—— CP TTS-Config */
export interface TtsConfig {
  provider: string
  // edge
  edge_voice?: string | null
  // openai 协议
  openai_base_url?: string | null
  openai_model?: string | null
  openai_voice?: string | null
  // doubao
  doubao_voice?: string | null
  doubao_resource_id?: string | null
  // local
  local_voice?: string | null
  ffmpeg_bin?: string | null
  // indextts（oMLX /v1/audio/speech 零样本克隆）
  indextts_base_url?: string | null
  indextts_model?: string | null
  indextts_ref_audio?: string | null
  indextts_ref_text?: string | null
  api_key_set: boolean
  api_key_last4?: string | null
  /** db = system_config 表里配了；env = 回落环境变量/默认值 */
  source?: string | null
  updated_at?: string | null
}

/** GET /api/v1/admin/tts/test 响应 —— 用当前 factory client 真合成一次 */
export interface TtsTestResult {
  provider: string
  voice?: string | null
  bytes_len?: number | null
  ok: boolean
  error?: string | null
}

/** 蒸馏 P95 响应 — GET /api/v1/admin/distill-p95 */
export interface DistillStepPercentiles {
  p50: number | null
  p95: number | null
  p99: number | null
}

export interface DistillP95Response {
  cached: boolean
  by_step: Record<string, DistillStepPercentiles>
  overall: DistillStepPercentiles
  error?: string
}
