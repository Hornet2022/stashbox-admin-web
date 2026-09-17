import axios from 'axios'

/**
 * Axios 实例 —— 所有 admin 端点的统一入口。
 *
 * baseURL 走 api-gateway（本地 http://localhost:8100），
 * 可用 VITE_API_BASE_URL 覆盖。
 *
 * ⚠️ CP-ADMIN-1 只建实例，不接任何真实 API 调用（红线）。
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8100'

export const ADMIN_API_PREFIX = '/api/v1/admin'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 请求拦截器 —— 注入 Authorization header。
 *
 * 注意：本期未接登录，token 读取逻辑在 CP-ADMIN-2 接 auth 时补齐。
 */
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('stashbox_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * 响应拦截器 —— 401 时清 token 跳登录页。
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('stashbox_admin_token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
