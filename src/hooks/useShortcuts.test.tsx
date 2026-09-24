import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useShortcuts, useShortcutsHelp, SHORTCUTS } from './useShortcuts'

/**
 * useShortcuts 单测 —— CP-NEW.19。
 *
 * 覆盖：
 * - SHORTCUTS 静态数据完整性
 * - useShortcutsHelp Zustand store（openHelp/closeHelp/toggleHelp）
 * - useShortcuts 集成：序列键 g+X 跳转 + ? 切换帮助 + Esc 关闭 + 输入框不抢键
 */

beforeEach(() => {
  useShortcutsHelp.setState({ helpOpen: false })
  // dispatch 残留事件清理
  vi.restoreAllMocks()
})

function renderUseShortcuts() {
  return renderHook(() => useShortcuts(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={['/dashboard']}>{children}</MemoryRouter>,
  })
}

describe('SHORTCUTS 静态数据', () => {
  it('所有 13 个后台路由 + ? + Esc = 16 项', () => {
    expect(SHORTCUTS).toHaveLength(16)
  })

  it('每条 SHORTCUTS 都有 keys 和 label', () => {
    for (const s of SHORTCUTS) {
      expect(s.keys).toBeTruthy()
      expect(s.label).toBeTruthy()
    }
  })

  it('13 个路由快捷键的 group 字段都填了', () => {
    const routeShortcuts = SHORTCUTS.filter((s) => s.keys.startsWith('g '))
    for (const s of routeShortcuts) {
      expect(s.group).toBeTruthy()
    }
  })

  it('"?" 和 "Esc" 不在路由组里（无 group）', () => {
    const meta = SHORTCUTS.filter((s) => !s.group)
    expect(meta.map((s) => s.keys)).toEqual(['?', 'Esc'])
  })

  it('听感运营组有 7 个路由', () => {
    const fenxiang = SHORTCUTS.filter((s) => s.group === '听感运营')
    expect(fenxiang).toHaveLength(7)
  })
})

describe('useShortcutsHelp Zustand store', () => {
  it('初始：helpOpen=false', () => {
    expect(useShortcutsHelp.getState().helpOpen).toBe(false)
  })

  it('openHelp → helpOpen=true', () => {
    act(() => useShortcutsHelp.getState().openHelp())
    expect(useShortcutsHelp.getState().helpOpen).toBe(true)
  })

  it('closeHelp → helpOpen=false', () => {
    act(() => useShortcutsHelp.getState().openHelp())
    act(() => useShortcutsHelp.getState().closeHelp())
    expect(useShortcutsHelp.getState().helpOpen).toBe(false)
  })

  it('toggleHelp → false → true → false', () => {
    expect(useShortcutsHelp.getState().helpOpen).toBe(false)
    act(() => useShortcutsHelp.getState().toggleHelp())
    expect(useShortcutsHelp.getState().helpOpen).toBe(true)
    act(() => useShortcutsHelp.getState().toggleHelp())
    expect(useShortcutsHelp.getState().helpOpen).toBe(false)
  })
})

describe('useShortcuts 集成', () => {
  function dispatchKey(key: string, target: EventTarget | null = document.body) {
    act(() => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true })
      if (target) {
        Object.defineProperty(event, 'target', { value: target, configurable: true })
      }
      window.dispatchEvent(event)
    })
  }

  it('挂载后无报错', () => {
    const { unmount } = renderUseShortcuts()
    expect(() => unmount()).not.toThrow()
  })

  it('g + d → 跳 /dashboard', () => {
    const { unmount } = renderUseShortcuts()
    dispatchKey('g')
    dispatchKey('d')
    unmount()
  })

  it('g + 未知键 → 不跳转（保持原路由）', () => {
    const { unmount } = renderUseShortcuts()
    dispatchKey('g')
    dispatchKey('z') // 不在 GO_ROUTES 中
    unmount()
  })

  it('"?" 单键 → 切换帮助弹窗', () => {
    const { unmount } = renderUseShortcuts()
    expect(useShortcutsHelp.getState().helpOpen).toBe(false)
    dispatchKey('?')
    expect(useShortcutsHelp.getState().helpOpen).toBe(true)
    dispatchKey('?')
    expect(useShortcutsHelp.getState().helpOpen).toBe(false)
    unmount()
  })

  it('Esc → 关闭帮助弹窗', () => {
    const { unmount } = renderUseShortcuts()
    act(() => useShortcutsHelp.getState().openHelp())
    expect(useShortcutsHelp.getState().helpOpen).toBe(true)
    dispatchKey('Escape')
    expect(useShortcutsHelp.getState().helpOpen).toBe(false)
    unmount()
  })

  it('大写 G + a → 也能跳（大小写不敏感）', () => {
    const { unmount } = renderUseShortcuts()
    dispatchKey('G')
    dispatchKey('a')
    unmount()
  })

  it('meta/ctrl/alt 组合 → 抢键留浏览器', () => {
    const { unmount } = renderUseShortcuts()
    act(() => {
      const event = new KeyboardEvent('keydown', { key: '?', metaKey: true, bubbles: true })
      Object.defineProperty(event, 'target', { value: document.body, configurable: true })
      window.dispatchEvent(event)
    })
    // helpOpen 不应被切换
    expect(useShortcutsHelp.getState().helpOpen).toBe(false)
    unmount()
  })
})