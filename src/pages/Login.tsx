import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { toErrorMessage } from '../api/client'
import { useAuthStore } from '../store/auth'
import { toast } from '../store/toast'
import { buttonPrimaryClass, inputClass } from '../components/ui'

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
      // 只留表单内联提示。原来 setError + toast 同时发，同一句话在两个
      // 位置各出现一次；而表单是**唯一**该报错的地方，toast 会飘到
      // 右上角、还会被 toast 栈的 4 条上限和去重逻辑牵连。
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 dark:bg-neutral-900">
      {/* w-96 = 384px，比 iPhone SE/8 的 375px 还宽 → 整页横向溢出。
          改成 w-full + max-w-md，窄屏自适应、宽屏仍是 448px。 */}
      {/* t-content-in：这是全站唯一没有入场动效的整屏，也是**唯一一个
          不需要导航上下文的整屏** —— 所有登录后页面都有 Layout 的 120ms
          淡入，登录页是静态的一个居中盒子，而它是整个产品里最常被看到
          的第一帧。复用现成 token，不新增动效语法。 */}
      <div className="t-content-in w-full max-w-md rounded-lg border border-neutral-200 bg-neutral-50 p-8 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
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
            // role="alert"：这段文字是提交后才动态出现的，屏幕阅读器
            // 需要被明确通知；没有这个角色时焦点还在按钮上，读屏用户
            // 完全不知道发生了什么。
            <p
              role="alert"
              className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error-ink"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            // 忙碌时按钮的可见文字不能消失：aria-busy 告诉辅助技术状态，
            // 但屏幕阅读器读到的是「登录中…」，不是空按钮。
            aria-busy={submitting}
            className={`flex w-full items-center justify-center gap-2 ${buttonPrimaryClass}`}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                登录中…
              </>
            ) : (
              '登录'
            )}
          </button>
        </form>

        <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
          账号与会话记录都会写入审计日志
        </p>
      </div>
    </div>
  )
}

export default Login
