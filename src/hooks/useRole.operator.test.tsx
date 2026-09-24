import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCanAnnotate, useCanWrite } from './useRole'
import { useAuthStore } from '../store/auth'

/**
 * operator 视图差异化 —— CP-NEW.17 单测。
 *
 * useCanAnnotate: super_admin / operator 可调（评测标注 + 盲测打分）
 * useCanWrite: 仅 super_admin（重试/删除/调整配额/清理/PUT 配置）
 *
 * 注：admin 角色通过 hasPermission 的"向上升级"已涵盖在 useRole.test.tsx，
 * 这里专注 operator 的差异化。
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

  it('super_admin → true', () => {
    useAuthStore.setState({ role: 'super_admin' })
    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(true)
  })

  it('admin → true（向上升级兼容，admin 视为 super_admin）', () => {
    // CP-NEW.1 语义：admin 角色视为可访问 super_admin 资源
    // 所以 useCanAnnotate 也对 admin 开放
    useAuthStore.setState({ role: 'admin' })
    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(true)
  })

  it('role=null → false', () => {
    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(false)
  })

  it('reactivity：role 变化时 hook 重新计算', () => {
    // role=null → false
    const { result, rerender } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(false)
    useAuthStore.setState({ role: 'operator' })
    rerender()
    expect(result.current).toBe(true)
    useAuthStore.setState({ role: 'viewer' })
    rerender()
    expect(result.current).toBe(false)
  })
})

describe('useCanWrite (CP-NEW.17)', () => {
  it('super_admin → true', () => {
    useAuthStore.setState({ role: 'super_admin' })
    const { result } = renderHook(() => useCanWrite())
    expect(result.current).toBe(true)
  })

  it('admin → true（向上升级兼容）', () => {
    useAuthStore.setState({ role: 'admin' })
    const { result } = renderHook(() => useCanWrite())
    expect(result.current).toBe(true)
  })

  it('operator → false（不能写危险动作）', () => {
    useAuthStore.setState({ role: 'operator' })
    const { result } = renderHook(() => useCanWrite())
    expect(result.current).toBe(false)
  })

  it('role=null → false', () => {
    const { result } = renderHook(() => useCanWrite())
    expect(result.current).toBe(false)
  })
})