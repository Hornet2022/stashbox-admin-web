import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/**
 * 后台主框架：左侧导航 + 顶部栏 + 内容区（Outlet）。
 */
export function Layout() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
