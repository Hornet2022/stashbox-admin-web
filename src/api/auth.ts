import apiClient, { clearAuthToken, setAuthToken, type RetryableRequestConfig } from './client'

/** POST /api/v1/admin/auth/login 的响应（字段做了宽松处理） */
export interface AdminLoginResponse {
  token?: string
  access_token?: string
  role?: string
  user_id?: number
  user?: {
    id?: number
    email?: string
    role?: string
  }
}

export interface LoginResult {
  role: string
  userId: number
  email?: string
}

/**
 * 管理员登录。
 *
 * 后端 CP3.6.2-XIN 会 set_cookie 下发会话；这里额外把
 * role / user_id 落到 sessionStorage，供 AuthGuard 做前端守卫。
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  // __retryOn5xx: true —— admin login 是幂等请求，cold-start 偶发 5xx
  // 时由 apiClient 拦截器自动重试 1 次，避开「首次到达 → 路由未 warm → 500」
  // 的 race。quota-adjust / force-retry 这类有副作用的 POST 不开。
  const { data } = await apiClient.post<AdminLoginResponse>(
    '/api/v1/admin/auth/login',
    { email, password },
    { __retryOn5xx: true } as RetryableRequestConfig,
  )

  // 后端可能把结果包在 data.data 里，两种形态都兜住
  const payload = ((data as unknown as { data?: AdminLoginResponse })?.data ??
    data) as AdminLoginResponse

  const token = payload.token ?? payload.access_token
  if (token) setAuthToken(token)

  // ⚠️ 拿不到 role 时**兜底成最小权限 'operator'**，不是 'admin'。
  //
  // 原来兜底的是 'admin'：后端的 AdminLoginResponse 没有顶层 role 字段，
  // 只有 user.role（= user.tier）。正常路径走 payload.user?.role 是对的；
  // 但一旦 user 缺失（响应结构漂移 / 网关改包信封 / 后端改字段），
  // role 会**静默**变成 'admin'。
  //
  // 而 hasPermission('admin', ['super_admin']) 返回 **true**（admin 向上升级）
  // → 所有写按钮都亮出来，而后端 require_admin_or_operator 会 403 →
  // 用户看到一排可点的危险按钮，点下去全部 403，且没有解释。
  //
  // 兜底成最小权限：拿不到就当自己是 operator —— 少几个按钮，
  // 比多一排点不动还报 403 的按钮强。
  const role = payload.role ?? payload.user?.role ?? 'operator'
  const userId = payload.user_id ?? payload.user?.id ?? 0

  sessionStorage.setItem('admin_role', role)
  sessionStorage.setItem('admin_user_id', String(userId))

  return { role, userId, email: payload.user?.email }
}

/** 清理本地会话并回登录页 */
export function logout() {
  clearAuthToken()
  sessionStorage.removeItem('admin_role')
  sessionStorage.removeItem('admin_user_id')
  window.location.href = '/login'
}

export function getRole(): string | null {
  return sessionStorage.getItem('admin_role')
}
