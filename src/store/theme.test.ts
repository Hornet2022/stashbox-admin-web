import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore, applyTheme } from './theme'

/**
 * useThemeStore —— CP-NEW.11。
 *
 * 主题切换 + 持久化 + applyTheme DOM 副作用。
 */

beforeEach(() => {
  // 清 localStorage
  window.localStorage.clear()
  // 重置 state
  useThemeStore.setState({ theme: 'light' })
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
})

describe('useThemeStore', () => {
  it('初始默认 light', () => {
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('setTheme(dark) 切到 dark + 写 localStorage + 给 <html> 加 dark class', () => {
    useThemeStore.getState().setTheme('dark')
    const s = useThemeStore.getState()
    expect(s.theme).toBe('dark')
    expect(window.localStorage.getItem('stashbox_admin_theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('toggleTheme 在 light ↔ dark 间切换', () => {
    expect(useThemeStore.getState().theme).toBe('light')
    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('applyTheme(light) 移除 dark class + 设置 colorScheme=light', () => {
    document.documentElement.classList.add('dark')
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})