import { useNavigate } from 'react-router-dom'
import { Sun, Moon, HelpCircle, LogOut } from 'lucide-react'
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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 md:px-6 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — only visible on small screens */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="打开导航菜单"
          className="md:hidden rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:bg-neutral-800"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          运营管理后台
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openHelp}
          title="快捷键帮助（?）"
          className="flex items-center gap-1 rounded border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <HelpCircle size={12} />
          快捷键
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          aria-pressed={isDark}
          title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          className="flex items-center gap-1.5 rounded border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
          {isDark ? '亮色' : '暗色'}
        </button>
        <span className="text-sm text-neutral-600 dark:text-neutral-300">
          {role ?? 'admin'}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="退出登录"
          className="flex items-center gap-1.5 rounded border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
        >
          <LogOut size={12} />
          退出
        </button>
      </div>
    </header>
  )
}

export default Header
