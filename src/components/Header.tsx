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

  /**
   * 图标按钮的统一形态。
   *
   * 之前三个按钮都带文字（快捷键 / 暗色 / 退出），在 390px 下每个都被
   * 挤成两行，而 header 是写死的 h-14 —— 文字直接撑出容器，
   * 页面顶部变成一排锯齿。现在一律只留图标，文字标签交给 title/aria-label。
   */
  const iconBtn =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-4 md:px-6 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="打开导航菜单"
          className={`${iconBtn} md:hidden`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="t-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
          运营管理后台
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={openHelp}
          title="快捷键帮助（?）"
          aria-label="快捷键帮助"
          className={iconBtn}
        >
          <HelpCircle size={14} />
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          aria-pressed={isDark}
          title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          className={iconBtn}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        {/* 账号名在窄屏没有立足之地；角色是次要信息，
            且操作本身有 aria-label，无障碍不依赖可见文字。 */}
        <span className="hidden text-sm text-neutral-600 dark:text-neutral-300 lg:inline">
          {role ?? 'admin'}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="退出登录"
          title="退出登录"
          className={iconBtn}
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  )
}

export default Header
