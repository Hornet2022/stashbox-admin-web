import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Drawer } from 'vaul'
import { Header } from './Header'
import { Sidebar, SidebarNav } from './Sidebar'

/**
 * 后台主框架：左侧导航 + 顶部栏 + 内容区（Outlet）。
 * 听匣 Design System：安静、留白、无 glassmorphism。
 */
export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Desktop sidebar — hidden on mobile
          h-full 不可省：外层 div 在 flex 容器里会 stretch 到 h-screen，但它的
          子元素 <aside> 没有高度约束时只按内容高走。导航 16 项 + 4 个分组标题
          实测高 922px，在 1280×720 / 1440×780 这两种最常见的笔记本视口下会顶出
          视口 —— body 跟着长出滚动条，而 main 自己又有 overflow-auto，于是
          出现双滚动条，侧栏底部的版本号和分隔线也永远够不着。 */}
      <div className="hidden h-full md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      <Drawer.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/30" />
          <Drawer.Content className="fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col border-r border-neutral-200 bg-neutral-50 outline-none dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
              <Drawer.Title className="text-sm font-semibold tracking-wide text-ink dark:text-neutral-100">
                导航
              </Drawer.Title>
              <Drawer.Close
                className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                aria-label="关闭导航菜单"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </Drawer.Close>
            </div>
            <SidebarNav />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        {/* p-6 在 390px 下左右各留 24px，内容只剩 342px —— 表格挤不下。
            窄屏收到 16px，桌面保持 24px 的呼吸感。 */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* key 绑 pathname：路由一变整块内容重新挂载，入场动画才会重播。
              不加 key 的话动画只在首次加载跑一次，之后换页都是硬跳变。 */}
          <div key={pathname} className="t-content-in mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
