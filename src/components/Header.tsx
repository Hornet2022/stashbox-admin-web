import { useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { useAuthStore } from '../store/auth'

export function Header() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  /** 清本地会话 + 清 Zustand + 回登录页 */
  const handleLogout = () => {
    clearAuth()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-14 shrink-0 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <span className="text-sm text-gray-500">运营管理后台</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{role ?? 'admin'}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-900 border border-gray-300 rounded px-3 py-1 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  )
}

export default Header
