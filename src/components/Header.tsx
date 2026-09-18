import { useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { useAuthStore } from '../store/auth'
import { useThemeStore } from '../store/theme'
import { useShortcutsHelp } from '../hooks/useShortcuts'

interface HeaderProps {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const openHelp = useShortcutsHelp((s) => s.openHelp)

  /** 清本地会话 + 清 Zustand + 回登录页 */
  const handleLogout = () => {
    clearAuth()
    logout()
    navigate('/login', { replace: true })
  }

  const isDark = theme === 'dark'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — only visible on small screens */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="打开导航菜单"
          className="md:hidden rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm text-gray-500 dark:text-slate-400">
          运营管理后台
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={openHelp}
          title="快捷键帮助（?）"
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          ? 快捷键
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          aria-pressed={isDark}
          title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {isDark ? '☀ 亮色' : '☾ 暗色'}
        </button>
        <span className="text-sm text-gray-600 dark:text-slate-300">
          {role ?? 'admin'}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="退出登录"
          className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
        >
          Logout
        </button>
      </div>
    </header>
  )
}

export default Header
