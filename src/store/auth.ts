import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  role: string | null
  userId: number | null
  setAuth: (role: string, userId: number) => void
  clearAuth: () => void
}

const ROLE_KEY = 'admin_role'
const USER_ID_KEY = 'admin_user_id'
const AUTH_STORAGE_KEY = 'stashbox_admin_token'

/** 从 JWT token payload 解码 role（不验证签名，仅客户端角色提取）。 */
function getRoleFromToken(): string | null {
  const token = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role ?? null
  } catch {
    return null
  }
}

function readUserId(): number | null {
  const raw = sessionStorage.getItem(USER_ID_KEY)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * 鉴权状态（Zustand）。
 *
 * 会话本身由后端 httpOnly cookie 承载，这里只镜像 role / user_id，
 * 供路由守卫做前端拦截。刷新页面后从 JWT token 解码 role（sessionStorage 兜底）。
 */
export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!(localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(ROLE_KEY)),
  role: getRoleFromToken() ?? sessionStorage.getItem(ROLE_KEY),
  userId: readUserId(),

  setAuth: (role, userId) => {
    sessionStorage.setItem(ROLE_KEY, role)
    sessionStorage.setItem(USER_ID_KEY, String(userId))
    set({ isAuthenticated: true, role, userId })
  },

  clearAuth: () => {
    sessionStorage.removeItem(ROLE_KEY)
    sessionStorage.removeItem(USER_ID_KEY)
    set({ isAuthenticated: false, role: null, userId: null })
  },
}))

export default useAuthStore
