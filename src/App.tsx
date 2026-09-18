import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthGuard } from './components/AuthGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastContainer } from './components/Toast'
import { Modal } from './components/ui'
import { SHORTCUTS, useShortcuts, useShortcutsHelp } from './hooks/useShortcuts'
import { Login } from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Users = lazy(() => import('./pages/Users'))
const Tags = lazy(() => import('./pages/Tags'))
const Articles = lazy(() => import('./pages/Articles'))
const PushNotifications = lazy(() => import('./pages/PushNotifications'))
const AuditLog = lazy(() => import('./pages/AuditLog'))

/** Route-level loading fallback */
function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
      <div className="h-4 w-72 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded bg-gray-100 dark:bg-slate-800"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * 快捷键层 —— 注册全局键盘监听 + 渲染 "?" 帮助弹窗。
 *
 * 必须在 BrowserRouter 内部（useShortcuts 依赖 useNavigate）。
 */
function ShortcutsLayer() {
  useShortcuts()
  const helpOpen = useShortcutsHelp((s) => s.helpOpen)
  const closeHelp = useShortcutsHelp((s) => s.closeHelp)

  return (
    <Modal open={helpOpen} title="键盘快捷键" onClose={closeHelp}>
      <ul className="divide-y divide-gray-100 dark:divide-slate-700">
        {SHORTCUTS.map((item) => (
          <li key={item.keys} className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600 dark:text-slate-300">
              {item.label}
            </span>
            <kbd className="rounded border border-gray-300 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
              {item.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ShortcutsLayer />
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <Dashboard />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="users"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <Users />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="tags"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <Tags />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="articles"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <Articles />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="push-notifications"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <PushNotifications />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="audit-log"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <AuditLog />
                  </Suspense>
                </AuthGuard>
              }
            />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
