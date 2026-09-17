import { create } from 'zustand'

/**
 * 主题（暗色模式）状态 —— Zustand + localStorage 持久化。
 *
 * 生效方式：给 `<html>` 加 / 去 `dark` class，Tailwind `darkMode: 'class'`
 * 据此启用 `dark:` 变体。
 */

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'stashbox_admin_theme'

/** 读取初始主题：localStorage 优先，其次跟随系统偏好，兜底 light */
function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'

  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** 把主题写到 <html class="dark"> */
export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const initialTheme = readInitialTheme()
// 模块加载即生效，避免首屏闪白
applyTheme(initialTheme)

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,

  setTheme: (theme) => {
    window.localStorage.setItem(STORAGE_KEY, theme)
    applyTheme(theme)
    set({ theme })
  },

  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },
}))

export default useThemeStore
