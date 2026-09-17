import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { toErrorMessage } from '../api/client'
import { useAuthStore } from '../store/auth'
import { buttonPrimaryClass, inputClass } from '../components/ui'

/**
 * 登录页 —— 接 POST /api/v1/admin/auth/login（CP3.6.2-XIN）。
 *
 * 成功：写 role / user_id 到 sessionStorage + Zustand，跳 /dashboard。
 * 失败：页面内展示错误文案（无 toast 库，同时 console.warn 留痕）。
 */
export function Login() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 已登录直接进后台
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const result = await login(email, password)
      setAuth(result.role, result.userId)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('[CP-ADMIN-2] admin login failed:', message)
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-96 bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900">stashbox-admin</h1>
        <p className="mt-1 text-sm text-gray-500">运营管理后台登录</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              邮箱
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@stashbox.local"
              required
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`mt-1 ${inputClass}`}
            />
          </div>

          {error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full ${buttonPrimaryClass}`}
          >
            {submitting ? '登录中…' : '登录'}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-400">
          数据源：POST /api/v1/admin/auth/login
        </p>
      </div>
    </div>
  )
}

export default Login
