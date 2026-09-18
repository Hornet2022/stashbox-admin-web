import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Tags,
  FileText,
  Bell,
  ClipboardList,
} from 'lucide-react'
import { useRole } from '../hooks/useRole'
import type { AdminRole } from '../types'

export interface NavItem {
  path: string
  label: string
  minRole?: AdminRole
  icon: React.ReactNode
}

/** 侧边栏导航项 —— 与 App.tsx 路由一一对应 */
export const navItems: NavItem[] = [
  { path: '/dashboard',           label: '总览',        icon: <LayoutDashboard size={16} /> },
  { path: '/users',               label: '用户管理',     icon: <Users size={16} />,       minRole: 'super_admin' as AdminRole },
  { path: '/tags',                label: '标签管理',      icon: <Tags size={16} /> },
  { path: '/articles',           label: '文章管理',      icon: <FileText size={16} /> },
  { path: '/push-notifications',  label: '推送队列',      icon: <Bell size={16} /> },
  { path: '/audit-log',           label: '审计日志',      icon: <ClipboardList size={16} />, minRole: 'super_admin' as AdminRole },
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
            className={`mx-2 my-0.5 flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-neutral-200 font-medium text-ink dark:bg-neutral-700 dark:text-neutral-100'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-ink dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
            }`}
          >
            <span className={active ? 'text-warm-ochre' : 'text-neutral-400 dark:text-neutral-500'}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
      <div className="border-b border-neutral-200 p-4 font-serif text-lg font-semibold tracking-wide text-ink dark:border-neutral-700 dark:text-neutral-100">
        stashbox
      </div>
      <SidebarNav />
      <div className="border-t border-neutral-200 p-4 text-xs text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
        CP-ADMIN-3 v0.6
      </div>
    </aside>
  )
}

export default Sidebar
