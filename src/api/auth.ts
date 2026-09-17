import apiClient, { clearAuthToken, setAuthToken } from './client'

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
  const { data } = await apiClient.post<AdminLoginResponse>(
    '/api/v1/admin/auth/login',
    { email, password },
  )

  // 后端可能把结果包在 data.data 里，两种形态都兜住
  const payload = ((data as unknown as { data?: AdminLoginResponse })?.data ??
    data) as AdminLoginResponse

  const token = payload.token ?? payload.access_token
  if (token) setAuthToken(token)

  const role = payload.role ?? payload.user?.role ?? 'admin'
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
