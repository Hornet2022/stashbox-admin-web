import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRole, hasPermission, STAFF_ROLES } from './useRole'
import { useAuthStore } from '../store/auth'

/**
 * useRole + hasPermission 单测 —— CP-NEW.12，2026-10-22 按后端口径重写。
 *
 * ## 契约（现在）
 * - useRole(): 读 auth store 的 role，返回 AdminRole | null
 * - hasPermission(role, allowed): 纯集合判定 —— role 在 allowed 里就是 true
 * - STAFF_ROLES = ['admin', 'operator']：后端 `require_admin_or_operator`
 *   的前端对应（两档**同权**）
 *
 * ## 为什么重写（原来那份把虚构的阶梯写死了）
 * 后端真实角色只有 `admin` / `operator` 两档，且**同权**
 * （`common/auth_admin.py::ADMIN_TIERS`，所有 admin 端点用
 * `require_admin_or_operator`）。而旧测试锁的是四档阶梯
 * （admin / super_admin / operator / viewer）+ 「admin 向上升级」，
 * 里面甚至断言 `hasPermission('admin', ['admin'])` 是 **false** ——
 * 一个 admin 角色在「admin 权限」面前反而没有权限。
 *
 * 那套阶梯后端**根本不存在**（`super_admin` / `viewer` 没有对应值，
 * `require_admin` 定义了但全仓零路由使用）。留着它，前端就在演一套
 * 后端没有的角色体系 —— 将来后端真的用上 `require_admin` 时，
 * 前端会毫无预警地放行。
 *
 * 所以类型收窄成两档，判据退化成纯集合判定。
 */

beforeEach(() => {
  useAuthStore.setState({ role: null, userId: null, isAuthenticated: false })
})

describe('useRole', () => {
  it('role=null 时 useRole 返回 null', () => {
    const { result } = renderHook(() => useRole())
    expect(result.current).toBe(null)
  })

  it('role=admin 时 useRole 返回 admin', () => {
    useAuthStore.setState({ role: 'admin' })
    const { result } = renderHook(() => useRole())
    expect(result.current).toBe('admin')
  })

  it('role=operator 时 useRole 返回 operator', () => {
    useAuthStore.setState({ role: 'operator' })
    const { result } = renderHook(() => useRole())
    expect(result.current).toBe('operator')
  })
})

describe('hasPermission', () => {
  it('null role → 始终 false', () => {
    expect(hasPermission(null, ['admin'])).toBe(false)
    expect(hasPermission(null, STAFF_ROLES)).toBe(false)
    expect(hasPermission(null, [])).toBe(false)
  })

  it('admin 在 allowed 里 → true', () => {
    expect(hasPermission('admin', ['admin'])).toBe(true)
    expect(hasPermission('admin', STAFF_ROLES)).toBe(true)
  })

  it('operator 在 allowed 里 → true', () => {
    expect(hasPermission('operator', ['operator'])).toBe(true)
    expect(hasPermission('operator', STAFF_ROLES)).toBe(true)
  })

  it('不在 allowed 里 → false（admin 也不例外）', () => {
    // 旧契约里 admin 对 ['admin'] 是 false（"admin 向上升级"那套）。
    // 现在没有等级概念：admin 就是 admin，不在集合里就是 false。
    expect(hasPermission('admin', ['operator'])).toBe(false)
    expect(hasPermission('admin', [])).toBe(false)
    expect(hasPermission('operator', ['admin'])).toBe(false)
    expect(hasPermission('operator', [])).toBe(false)
  })
})

describe('STAFF_ROLES', () => {
  it('与后端 ADMIN_TIERS 一致：两档且同权', () => {
    // 后端 common/auth_admin.py::ADMIN_TIERS = {"admin", "operator"}
    expect([...STAFF_ROLES].sort()).toEqual(['admin', 'operator'])
  })

  it('admin 与 operator 权限相同（都能写）', () => {
    expect(hasPermission('admin', STAFF_ROLES)).toBe(
      hasPermission('operator', STAFF_ROLES),
    )
  })
})
