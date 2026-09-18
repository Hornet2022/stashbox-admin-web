import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Drawer } from 'vaul'
import { Header } from './Header'
import { Sidebar, SidebarNav } from './Sidebar'

/**
 * 后台主框架：左侧导航 + 顶部栏 + 内容区（Outlet）。
 * 听匣 Design System：安静、留白、无 glassmorphism。
 */
export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      <Drawer.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/30" />
          <Drawer.Content className="fixed bottom-0 left-0 top-0 z-50 w-56 bg-neutral-50 outline-none dark:bg-neutral-900">
            <Drawer.Handle className="mx-auto mt-3 h-1 w-12 flex-shrink-0 cursor-grab rounded-full bg-neutral-300 dark:bg-neutral-600" />
            <Drawer.Title className="sr-only">导航菜单</Drawer.Title>
            <SidebarNav />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
