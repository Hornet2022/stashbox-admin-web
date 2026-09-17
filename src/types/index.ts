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

export type AdminRole = 'super_admin' | 'operator' | 'viewer'

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
