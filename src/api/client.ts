import axios from 'axios'
import { toast } from '../store/toast'

/**
 * Axios 实例 —— 所有 admin 端点的统一入口。
 *
 * baseURL 走 api-gateway（本地 http://localhost:8100），
 * 可用 VITE_API_BASE_URL 覆盖。
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8100'

export const ADMIN_API_PREFIX = '/api/v1/admin'

/** 后端下发的会话 cookie 名（httpOnly 时 JS 读不到，此时退回 localStorage） */
const AUTH_COOKIE_NAMES = ['admin_token', 'stashbox_admin_token']
const AUTH_STORAGE_KEY = 'stashbox_admin_token'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  // 后端登录走 set_cookie，跨端口请求必须带上凭证
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

/** 从 document.cookie 里取指定 cookie 值 */
function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * 读取当前会话 token：cookie 优先（后端 set_cookie），
 * cookie 是 httpOnly 读不到时退回 localStorage。
 */
export function getAuthToken(): string | null {
  for (const name of AUTH_COOKIE_NAMES) {
    const value = readCookie(name)
    if (value) return value
  }
  return localStorage.getItem(AUTH_STORAGE_KEY)
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_STORAGE_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  for (const name of AUTH_COOKIE_NAMES) {
    document.cookie = `${name}=; Max-Age=0; path=/`
  }
}

/**
 * 请求拦截器 —— 注入 Authorization header。
 */
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * 响应拦截器 —— 统一把失败状态转成 Toast，401 额外清会话跳登录页。
 *
 * - 401 → “登录已过期” + 跳 /login
 * - 5xx → “服务异常（xxx）”
 * - 4xx → 按状态码给中文文案
 * - 无 response（网关/后端未起）→ 不弹 toast，页面侧已有“功能待上线”提示
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = (error as { response?: { status?: number } })?.response?.status

    if (status === 401) {
      clearAuthToken()
      sessionStorage.removeItem('admin_role')
      sessionStorage.removeItem('admin_user_id')
      toast('登录已过期，请重新登录', 'error')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (typeof status === 'number' && status >= 500) {
      toast(`服务异常（${status}）`, 'error')
    } else if (typeof status === 'number' && status >= 400) {
      toast(toErrorMessage(error), 'error')
    }

    return Promise.reject(error)
  },
)

/** 端点不存在 / 网关未上线时的判定（404 / 501 / 网络不可达） */
export function isEndpointMissing(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 404 || status === 501) return true
  // 没有 response 说明请求根本没到后端（dev server 未起 / 网关未启）
  return status === undefined
}

/** 把任意异常压成一句可展示的中文 */
export function toErrorMessage(error: unknown): string {
  const err = error as {
    response?: { status?: number; data?: { message?: string; detail?: string } }
    message?: string
  }
  const status = err?.response?.status
  const detail = err?.response?.data?.message ?? err?.response?.data?.detail
  if (detail) return detail
  if (status === 404 || status === 501) return '功能待上线'
  if (status === 401) return '登录已失效，请重新登录'
  if (status === 403) return '无权限访问该资源'
  if (status === 429) return '请求过于频繁，请稍后再试'
  if (status && status >= 500) return `服务端错误（${status}）`
  if (status) return `请求失败（${status}）`
  return '无法连接后端服务（功能待上线）'
}

export default apiClient
