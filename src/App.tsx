import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
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
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="tags" element={<Tags />} />
          <Route path="articles" element={<Articles />} />
          <Route path="push-notifications" element={<PushNotifications />} />
          <Route path="audit-log" element={<AuditLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
