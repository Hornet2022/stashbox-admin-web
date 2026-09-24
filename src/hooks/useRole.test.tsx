import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRole, hasPermission } from './useRole'
import { useAuthStore } from '../store/auth'

/**
 * useRole + hasPermission 单测 —— CP-NEW.12。
 *
 * 契约：
 * - useRole(): 阅读 auth store 的 role 返回 AdminRole | null
 * - hasPermission(role, required): admin 向上升级为 super_admin 等价后判断
 *   · admin + required含 super_admin → true（升级兼容）
 *   · admin + required 不含 super_admin → false
 *   · super_admin + required含 super_admin → true
 *   · super_admin + required 不含 super_admin → false（不向下兼容）
 *   · operator + required含 operator → true
 *   · null + 任意 → false
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

  it('role=super_admin 时 useRole 返回 super_admin', () => {
    useAuthStore.setState({ role: 'super_admin' })
    const { result } = renderHook(() => useRole())
    expect(result.current).toBe('super_admin')
  })
})

describe('hasPermission', () => {
  it('null role → 始终 false', () => {
    expect(hasPermission(null, ['admin'])).toBe(false)
    expect(hasPermission(null, ['super_admin'])).toBe(false)
    expect(hasPermission(null, [])).toBe(false)
  })

  it('admin 向上升级为 super_admin 等价：required含 super_admin → true', () => {
    expect(hasPermission('admin', ['super_admin'])).toBe(true)
    expect(hasPermission('admin', ['super_admin', 'operator'])).toBe(true)
  })

  it('admin 角色：required 不含 super_admin → false（不向下兼容）', () => {
    expect(hasPermission('admin', ['admin'])).toBe(false)
    expect(hasPermission('admin', ['operator'])).toBe(false)
    expect(hasPermission('admin', ['viewer'])).toBe(false)
    expect(hasPermission('admin', [])).toBe(false)
  })

  it('super_admin 仅匹配 required 含 super_admin', () => {
    expect(hasPermission('super_admin', ['super_admin'])).toBe(true)
    expect(hasPermission('super_admin', ['super_admin', 'admin'])).toBe(true)
    expect(hasPermission('super_admin', ['admin'])).toBe(false)
    expect(hasPermission('super_admin', ['operator'])).toBe(false)
  })

  it('operator 仅匹配 required 含 operator', () => {
    expect(hasPermission('operator', ['operator'])).toBe(true)
    expect(hasPermission('operator', ['super_admin'])).toBe(false)
    expect(hasPermission('operator', ['admin'])).toBe(false)
  })
})