import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { toErrorMessage } from '../api/client'
import { useAuthStore } from '../store/auth'
import { toast } from '../store/toast'
import { Skeleton, buttonPrimaryClass, inputClass } from '../components/ui'

/**
 * 登录页 —— 接 POST /api/v1/admin/auth/login（CP3.6.2-XIN）。
 *
 * 成功：写 role / user_id 到 sessionStorage + Zustand，跳 /dashboard。
 * 失败：页面内展示错误文案 + 全局 Toast 提示。
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
      toast('登录成功', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('[CP-ADMIN-3] admin login failed:', message)
      setError(message)
      toast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 dark:bg-neutral-900">
      <div className="w-96 rounded-lg border border-neutral-200 bg-neutral-50 p-8 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <h1 className="font-serif text-2xl font-semibold text-ink dark:text-neutral-100">
          stashbox
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          运营管理后台登录
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-600 dark:text-neutral-300"
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
              className="block text-sm font-medium text-neutral-600 dark:text-neutral-300"
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
            <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`flex w-full items-center justify-center ${buttonPrimaryClass}`}
          >
            {submitting ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              '登录'
            )}
          </button>
        </form>

        <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
          数据源：POST /api/v1/admin/auth/login
        </p>
      </div>
    </div>
  )
}

export default Login
