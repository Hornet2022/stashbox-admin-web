import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth'

/**
 * useAuthStore —— CP-NEW.11。
 *
 * 实际 API：setAuth(role, userId) / clearAuth()
 * （会话由后端 httpOnly cookie 承载，本 store 仅镜像 role / userId）
 *
 * 不存在 login/logout 方法 —— token 由 cookie 注入。
 */

const ROLE_KEY = 'admin_role'
const USER_ID_KEY = 'admin_user_id'
const AUTH_STORAGE_KEY = 'stashbox_admin_token'

beforeEach(() => {
  // 清所有 storage
  window.localStorage.clear()
  window.sessionStorage.clear()
  // 重置 state
  useAuthStore.setState({
    isAuthenticated: false,
    role: null,
    userId: null,
  })
})

describe('useAuthStore', () => {
  it('初始：未登录', () => {
    const s = useAuthStore.getState()
    expect(s.role).toBe(null)
    expect(s.userId).toBe(null)
    expect(s.isAuthenticated).toBe(false)
  })

  it('setAuth 后 isAuthenticated=true 且 role/userId 设上', () => {
    useAuthStore.getState().setAuth('admin', 42)
    const s = useAuthStore.getState()
    expect(s.role).toBe('admin')
    expect(s.userId).toBe(42)
    expect(s.isAuthenticated).toBe(true)
  })

  it('setAuth 同步写 sessionStorage（role / userId）', () => {
    useAuthStore.getState().setAuth('super_admin', 7)
    expect(sessionStorage.getItem(ROLE_KEY)).toBe('super_admin')
    expect(sessionStorage.getItem(USER_ID_KEY)).toBe('7')
  })

  it('clearAuth 后回到未登录 + 清 sessionStorage', () => {
    useAuthStore.getState().setAuth('operator', 99)
    useAuthStore.getState().clearAuth()
    const s = useAuthStore.getState()
    expect(s.role).toBe(null)
    expect(s.userId).toBe(null)
    expect(s.isAuthenticated).toBe(false)
    expect(sessionStorage.getItem(ROLE_KEY)).toBe(null)
    expect(sessionStorage.getItem(USER_ID_KEY)).toBe(null)
  })

  it('支持任意 role 字符串（不限 admin/super_admin/operator）', () => {
    for (const r of ['admin', 'super_admin', 'operator', 'viewer', 'custom-role']) {
      useAuthStore.getState().setAuth(r, 1)
      expect(useAuthStore.getState().role).toBe(r)
      useAuthStore.getState().clearAuth()
      expect(useAuthStore.getState().role).toBe(null)
    }
  })

  it('localStorage 不直接存 token（cookie 流程）', () => {
    // 前端不直接写 AUTH_STORAGE_KEY —— token 由后端 httpOnly cookie 注入
    // 这里验证 setAuth 不会写到 localStorage[AUTH_STORAGE_KEY]
    useAuthStore.getState().setAuth('admin', 11)
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe(null)
    expect(sessionStorage.getItem(ROLE_KEY)).toBe('admin')
    expect(sessionStorage.getItem(USER_ID_KEY)).toBe('11')
  })
})