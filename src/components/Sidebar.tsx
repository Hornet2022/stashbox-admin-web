import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  LayoutDashboard,
  Users,
  Tags,
  FileText,
  Bell,
  ClipboardList,
  Settings,
  Sparkles,
  Star,
  Route as RouteIcon,
  Ear,
  GitCompare,
  Layers,
  Mic,
  ShieldCheck,
} from 'lucide-react'
import { useRole } from '../hooks/useRole'
import type { AdminRole } from '../types'

/**
 * 侧边栏导航 —— CP-NEW.1 起按 group 分组渲染。
 *
 * 听匣 Design System：安静 / 留白 / 工具感。分组标题小字大写，间距宽松。
 *
 * 权限矩阵（CP-NEW.1 拍板）：
 * - 听感运营整区 super_admin（A3 标注 / A6 抽查 / A8 盲测打分等写动作也一并锁）
 * - A/B 报表（/ab-report）全员可见（实验进展要让运营知会），caveats 强提示
 * - 其他沿用现状
 */

export type SidebarGroupKey = '总览' | '内容运营' | '用户与系统' | '听感运营'

export interface NavItem {
  path: string
  label: string
  group: SidebarGroupKey
  /** 仅该角色可见（CP-NEW.17 留作窄门标记，绝大多数页面留空） */
  minRole?: AdminRole
  icon: React.ReactNode
}

/** 导航项顺序：按 group 内出现顺序
 *
 * CP-NEW.17：去掉所有 minRole 锁，operator 角色可以"读为主"访问全部后台。
 * 写动作（retry/delete/update/quota-adjust/cleanup）的权限在页面内通过
 * `hasPermission(role, ['super_admin'])` 单独判断，与 sidebar 可见性解耦。
 */
export const navItems: NavItem[] = [
  // —— 总览 ——
  { path: '/dashboard',         label: '总览',     group: '总览',     icon: <LayoutDashboard size={16} /> },
  { path: '/distill-metrics',   label: '蒸馏耗时', group: '总览',     icon: <BarChart3 size={16} /> },

  // —— 内容运营 ——
  { path: '/articles',          label: '文章管理', group: '内容运营', icon: <FileText size={16} /> },
  { path: '/tags',              label: '标签管理', group: '内容运营', icon: <Tags size={16} /> },
  { path: '/push-notifications', label: '推送队列', group: '内容运营', icon: <Bell size={16} /> },

  // —— 用户与系统 ——
  { path: '/users',             label: '用户管理', group: '用户与系统', icon: <Users size={16} /> },
  { path: '/settings/llm',      label: 'LLM 配置', group: '用户与系统', icon: <Settings size={16} /> },
  { path: '/settings/tts',      label: 'TTS 配置', group: '用户与系统', icon: <Settings size={16} /> },
  // CP-TTS-VOICE：音色库。刻意**不加 minRole** —— 侧边栏 minRole 目前是死字段，
  // Sidebar.operator.test.tsx 有静态测试强制 navItems 保持不设该字段；
  // 写操作权限在页面内用 hasPermission 判断（与 Tags 页同口径）。
  { path: '/settings/voices',   label: '音色库',   group: '用户与系统', icon: <Mic size={16} /> },
  { path: '/audit-log',         label: '审计日志', group: '用户与系统', icon: <ClipboardList size={16} /> },

  // —— 听感运营（CP-NEW.1 新增，CP-NEW.17 全员可见）——
  { path: '/few-shot-pool',     label: '听感池',     group: '听感运营', icon: <Sparkles size={16} /> },
  { path: '/evaluations',       label: '评测标注',   group: '听感运营', icon: <Star size={16} /> },
  { path: '/model-routing',     label: '模型路由',   group: '听感运营', icon: <RouteIcon size={16} /> },
  { path: '/tts-blind-test',    label: 'TTS 盲测',   group: '听感运营', icon: <Ear size={16} /> },
  { path: '/audio-variants',    label: '多码率统计', group: '听感运营', icon: <Layers size={16} /> },
  { path: '/consents',          label: 'GDPR 同意',  group: '听感运营', icon: <ShieldCheck size={16} /> },
  { path: '/ab-report',         label: 'A/B 报表',   group: '听感运营', icon: <GitCompare size={16} /> },
]

/** group 渲染顺序 */
const GROUP_ORDER: SidebarGroupKey[] = ['总览', '内容运营', '用户与系统', '听感运营']

/** 角色过滤：CP-NEW.17 全后台可见（读为主），仅 minRole 单独判定
 *
 * - 未登录 → 不显示任何项
 * - admin / super_admin / operator → 全可见
 * - viewer → 仅看得到没有 minRole 锁的页面（理论上不应该出现）
 */
function visibleItems(role: AdminRole | null): NavItem[] {
  if (!role) return []
  return navItems.filter((item) => {
    if (!item.minRole) return true
    return role === item.minRole
  })
}

/** 把可见项按 group 聚合 */
function groupItems(items: NavItem[]): Record<SidebarGroupKey, NavItem[]> {
  const grouped = Object.fromEntries(GROUP_ORDER.map((g) => [g, [] as NavItem[]])) as Record<
    SidebarGroupKey,
    NavItem[]
  >
  for (const item of items) grouped[item.group].push(item)
  return grouped
}

/** 可复用的导航渲染 —— 用于 Desktop Sidebar 和 Mobile Drawer */
export function SidebarNav() {
  const location = useLocation()
  const role = useRole()
  const grouped = groupItems(visibleItems(role))

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {GROUP_ORDER.map((groupKey, groupIdx) => {
        const items = grouped[groupKey]
        if (items.length === 0) return null
        return (
          <div key={groupKey} className={groupIdx === 0 ? '' : 'mt-5'}>
            <div className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
              {groupKey}
            </div>
            {items.map((item) => {
              const active = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative my-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-neutral-200/70 font-medium text-ink dark:bg-neutral-700/70 dark:text-neutral-100'
                      : 'text-neutral-500 hover:bg-neutral-100 hover:text-ink dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                  }`}
                >
                  {/* 选中态用暖赭竖条定位，比整块底色更轻、也更像「当前位置」 */}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="t-nav-active absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-warm-ochre"
                    />
                  )}
                  <span
                    className={
                      active
                        ? 'text-warm-ochre'
                        : 'text-neutral-400 transition-colors group-hover:text-neutral-500 dark:text-neutral-500'
                    }
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
      {/* 字标：中文主名用衬线（与 h1~h6 同一套排版语言），
          拉丁副名用无衬线小字。之前「stashbox」直接用衬线大字，
          和整页的中文黑体正文是两套语言并排，看着像贴上去的。 */}
      <div className="border-b border-neutral-200 px-4 py-4 dark:border-neutral-700">
        <div className="font-serif text-lg font-semibold leading-none tracking-wide text-ink dark:text-neutral-100">
          听匣
        </div>
        <div className="mt-1.5 font-sans text-[10px] uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500">
          Stashbox · Console
        </div>
      </div>
      <SidebarNav />
      <div className="border-t border-neutral-200 px-4 py-3 text-[11px] text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
        v0.7
      </div>
    </aside>
  )
}

export default Sidebar