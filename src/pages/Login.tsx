import { useState, type FormEvent } from 'react'

/**
 * 登录页骨架。
 *
 * ⚠️ CP-ADMIN-1 只做表单 UI，不调任何接口。
 * CP-ADMIN-2 接 POST /api/v1/admin/auth/login。
 */
export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // TODO(CP-ADMIN-2): 调 apiClient.post('/api/v1/admin/auth/login', ...)
    console.warn('[CP-ADMIN-1] 登录接口未接线', { username, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-96 bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900">stashbox-admin</h1>
        <p className="mt-1 text-sm text-gray-500">运营管理后台登录</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              用户名
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            登录
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-400">
          骨架版本：登录接口将在 CP-ADMIN-2 接线
        </p>
      </div>
    </div>
  )
}

export default Login
