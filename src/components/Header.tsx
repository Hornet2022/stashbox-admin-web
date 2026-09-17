import { useNavigate } from 'react-router-dom'

export function Header() {
  const navigate = useNavigate()

  /**
   * 本期只清本地 token 并跳登录页。
   * CP-ADMIN-2 接 /admin/auth/login 后补齐登出接口调用。
   */
  const handleLogout = () => {
    localStorage.removeItem('stashbox_admin_token')
    navigate('/login')
  }

  return (
    <header className="h-14 shrink-0 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <span className="text-sm text-gray-500">运营管理后台</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">Hornet</span>
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
