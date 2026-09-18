import { Link, useLocation } from 'react-router-dom'
import { useRole } from '../hooks/useRole'
import type { AdminRole } from '../types'

export interface NavItem {
  path: string
  label: string
  minRole?: AdminRole
}

/** 侧边栏导航项 —— 与 App.tsx 路由一一对应 */
export const navItems: NavItem[] = [
  { path: '/dashboard', label: '总览' },
  { path: '/users', label: '用户管理', minRole: 'super_admin' as AdminRole },
  { path: '/tags', label: '标签管理' },
  { path: '/articles', label: '文章管理' },
  { path: '/push-notifications', label: '推送队列' },
  { path: '/audit-log', label: '审计日志', minRole: 'super_admin' as AdminRole },
]

function visibleItems(role: AdminRole | null): NavItem[] {
  if (!role) return navItems.filter((item) => !('minRole' in item && item.minRole))
  return navItems.filter((item) => {
    if (!('minRole' in item)) return true
    return item.minRole === 'super_admin' && role === 'super_admin'
  })
}

/** 可复用的导航渲染 —— 用于 Desktop Sidebar 和 Mobile Drawer */
export function SidebarNav() {
  const location = useLocation()
  const role = useRole()
  const items = visibleItems(role)

  return (
    <nav className="mt-2 flex-1">
      {items.map((item) => {
        const active = location.pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={active ? 'page' : undefined}
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
  )
}

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-slate-800 text-white dark:border-r dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-700 p-4 text-xl font-bold">
        stashbox-admin
      </div>
      <SidebarNav />
      <div className="border-t border-slate-700 p-4 text-xs text-slate-400">
        CP-ADMIN-3 v0.5 ｜ 按 ? 看快捷键
      </div>
    </aside>
  )
}

export default Sidebar
