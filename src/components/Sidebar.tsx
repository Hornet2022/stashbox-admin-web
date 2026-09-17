import { Link, useLocation } from 'react-router-dom'

export interface NavItem {
  path: string
  label: string
}

/** 侧边栏导航项 —— 与 App.tsx 路由一一对应 */
export const navItems: NavItem[] = [
  { path: '/dashboard', label: '总览' },
  { path: '/users', label: '用户管理' },
  { path: '/tags', label: '标签管理' },
  { path: '/articles', label: '文章管理' },
  { path: '/push-notifications', label: '推送队列' },
  { path: '/audit-log', label: '审计日志' },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-56 shrink-0 bg-slate-800 text-white flex flex-col">
      <div className="p-4 text-xl font-bold border-b border-slate-700">
        stashbox-admin
      </div>
      <nav className="mt-2 flex-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 text-sm transition-colors ${
                active
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 text-xs text-slate-400 border-t border-slate-700">
        CP-ADMIN-2 已接线
      </div>
    </aside>
  )
}

export default Sidebar
