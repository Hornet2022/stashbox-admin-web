import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthGuard } from './components/AuthGuard'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Users } from './pages/Users'
import { Tags } from './pages/Tags'
import { Articles } from './pages/Articles'
import { PushNotifications } from './pages/PushNotifications'
import { AuditLog } from './pages/AuditLog'

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App
