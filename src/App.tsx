import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthGuard } from './components/AuthGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastContainer } from './components/Toast'
import { Modal } from './components/ui'
import { SHORTCUTS, useShortcuts, useShortcutsHelp } from './hooks/useShortcuts'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Users } from './pages/Users'
import { Tags } from './pages/Tags'
import { Articles } from './pages/Articles'
import { PushNotifications } from './pages/PushNotifications'
import { AuditLog } from './pages/AuditLog'

/**
 * 快捷键层 —— 注册全局键盘监听 + 渲染 “?” 帮助弹窗。
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
                  <Dashboard />
                </AuthGuard>
              }
            />
            <Route
              path="users"
              element={
                <AuthGuard>
                  <Users />
                </AuthGuard>
              }
            />
            <Route
              path="tags"
              element={
                <AuthGuard>
                  <Tags />
                </AuthGuard>
              }
            />
            <Route
              path="articles"
              element={
                <AuthGuard>
                  <Articles />
                </AuthGuard>
              }
            />
            <Route
              path="push-notifications"
              element={
                <AuthGuard>
                  <PushNotifications />
                </AuthGuard>
              }
            />
            <Route
              path="audit-log"
              element={
                <AuthGuard>
                  <AuditLog />
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
