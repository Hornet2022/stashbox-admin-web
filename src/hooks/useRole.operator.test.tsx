import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCanAnnotate, hasPermission, STAFF_ROLES } from './useRole'
import { useAuthStore } from '../store/auth'

/**
 * operator 视图差异化 —— CP-NEW.17 单测，2026-10-22 按后端口径重写。
 *
 * ## 现在的契约
 * `useCanAnnotate` = `hasPermission(role, STAFF_ROLES)`，
 * 而 `STAFF_ROLES = ['admin', 'operator']` —— 与后端
 * `require_admin_or_operator` 一一对应。
 *
 * ## 为什么 `useCanWrite` 这个 hook 被删了
 * 它原来的语义是「仅 super_admin 能做危险动作」，而 super_admin
 * **后端根本不存在**（后端只有 admin / operator 两档，且同权）。
 * 所以它判出来的「operator 不能写」是**假的** ——
 * 后端 `require_admin_or_operator` 明确放行 operator。
 *
 * 结果是一个**零调用**的 hook 承载着一条**与后端相反**的规则。
 * 留着它，下一个开发者照着它去改危险动作的按钮，就会把 operator
 * 挡住（后端却放行 → 前端少功能），或者反过来把 admin 当成普通账号。
 *
 * 危险动作的闸门统一走 `hasPermission(role, STAFF_ROLES)`，
 * 语义与后端一致；要真的分 admin-only 端点时，先在后端用上
 * `require_admin`，再来这里加一档。
 */

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: true, role: null, userId: null })
})

describe('useCanAnnotate (CP-NEW.17)', () => {
  it('operator → true', () => {
    useAuthStore.setState({ role: 'operator' })
    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(true)
  })

  it('admin → true', () => {
    useAuthStore.setState({ role: 'admin' })
    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(true)
  })

  it('role=null → false', () => {
    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(false)
  })

  it('reactivity：role 变化时 hook 重新计算', () => {
    const { result, rerender } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(false)
    useAuthStore.setState({ role: 'operator' })
    rerender()
    expect(result.current).toBe(true)
    useAuthStore.setState({ role: null })
    rerender()
    expect(result.current).toBe(false)
  })
})

describe('危险动作的闸门（原来的 useCanWrite）', () => {
  it('admin 与 operator 都能写 —— 与后端 require_admin_or_operator 同权', () => {
    expect(hasPermission('admin', STAFF_ROLES)).toBe(true)
    expect(hasPermission('operator', STAFF_ROLES)).toBe(true)
  })

  it('未登录 → 不能写', () => {
    expect(hasPermission(null, STAFF_ROLES)).toBe(false)
  })
})
