import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

/**
 * 路由守卫：未登录一律重定向到 /login。
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export default AuthGuard
