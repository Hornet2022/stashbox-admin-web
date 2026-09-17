/**
 * stashbox-admin-web 全局类型定义
 *
 * 本期（CP-ADMIN-1）只定义骨架类型，字段以后端 v1 §3.6 admin 端点为参考。
 * 后续 CP-ADMIN-2 接 API 时如有偏差，以实际响应为准修正。
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
  pageSize?: number
}

/** 分页响应体 */
export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** 管理员账号 */
export interface AdminUser {
  id: number
  username: string
  displayName?: string
  role: AdminRole
  lastLoginAt?: string
}

export type AdminRole = 'super_admin' | 'operator' | 'viewer'

/** 登录请求 / 响应 */
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  expiresIn: number
  user: AdminUser
}

/** 总览统计（GET /api/v1/admin/stats） */
export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalArticles: number
  pendingArticles: number
  totalTags: number
  pendingPushCount: number
  storageUsedBytes: number
}

/** 普通用户（GET /api/v1/admin/users） */
export interface User {
  id: number
  email: string
  nickname?: string
  status: UserStatus
  quotaBytes: number
  usedBytes: number
  articleCount: number
  createdAt: string
  lastActiveAt?: string
}

export type UserStatus = 'active' | 'suspended' | 'deleted'

/** 标签 */
export interface Tag {
  id: number
  name: string
  color?: string
  articleCount: number
  createdAt: string
}

/** 文章状态 */
export type ArticleStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

/** 文章 */
export interface Article {
  id: number
  title: string
  sourceUrl: string
  status: ArticleStatus
  tagIds: number[]
  userId: number
  retryCount: number
  createdAt: string
  updatedAt: string
}

/** 推送队列条目 */
export type PushStatus = 'queued' | 'sending' | 'sent' | 'failed'

export interface PushNotification {
  id: number
  title: string
  body: string
  status: PushStatus
  targetCount: number
  successCount: number
  failCount: number
  scheduledAt?: string
  createdAt: string
}

/** 审计日志 */
export interface AuditLogEntry {
  id: number
  actorId: number
  actorName: string
  action: string
  targetType: string
  targetId?: string
  detail?: string
  ip?: string
  createdAt: string
}

/** 用户配额调整请求（POST /api/v1/admin/users/{id}/quota-adjust） */
export interface QuotaAdjustRequest {
  deltaBytes: number
  reason: string
}
