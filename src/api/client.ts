import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { toast } from '../store/toast'

/**
 * 请求级 retry 配置（自定义字段，axios 不识别，仅本仓库拦截器使用）。
 *
 * - `__retryOn5xx`：true 时，5xx 响应自动重试 1 次（不等用户重试）
 * - `__retried`：拦截器内部标记，防止重试再失败后无限循环
 *
 * 默认行为：5xx 直接弹「服务端错误」toast，由用户重试。
 * 只对幂等且 cold-start 易 5xx 的请求（典型：admin/auth/login）
 * 显式开启 __retryOn5xx，避免 quota-adjust / force-retry 这类
 * 有副作用的 POST 被悄悄重试造成重复扣量。
 */
export type RetryableRequestConfig = AxiosRequestConfig & {
  __retryOn5xx?: boolean
  __retried?: boolean
}

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
  // CP-TIMEOUT：TTS /test 在第三方服务卡顿时可达 12-15s，10s 太紧会误杀。
  // 其他端点（GET /config 等）正常 < 1s，不影响。
  timeout: 15000,
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
    const config = (error as { config?: RetryableRequestConfig })?.config
    const status = (error as { response?: { status?: number } })?.response?.status

    // Cold-start race 兜底：5xx + 显式开启 __retryOn5xx → 重试 1 次。
    // 只对幂等请求有效；其他 5xx 仍然走 toast，不静默吞掉真错误。
    if (
      config &&
      config.__retryOn5xx &&
      !config.__retried &&
      typeof status === 'number' &&
      status >= 500
    ) {
      config.__retried = true
      return apiClient.request(config)
    }

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

/** 端点不存在判定（404 / 501 —— "功能待上线"占位）。
 *
 * CP-ERROR-MSG-v2：不再把"无 response"判为 missing —— 网络断开是临时故障，
 * 显示成"功能待上线"会让运维误判。toErrorMessage 已经区分超时 vs 网关不可达，
 * 这里只看 404 / 501（后端真没这个路由）。
 */
export function isEndpointMissing(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status === 404 || status === 501
}

/** 把任意异常压成一句可展示的中文。
 *
 * CP-ERROR-MSG-v3：
 *   - ECONNABORTED（axios.timeout 触发）→ "请求超时（Xs）— <context> 可能卡死 或 未启动"
 *   - 其他网络断开（gateway 未启 / 跨域）→ "无法连接 api-gateway（localhost:8100），请检查网关是否启动"
 * 不再回落到笼统的"功能待上线"，避免运维误判。
 *
 * 注意：v2 在文案里硬编码 "IndexTTS / 阿里云 maas"（TTS provider 名），
 * 但 toErrorMessage 被 LLM/TTS/Articles/Tags/Users/Login 6 个页面共享
 * —— LLM 测试触发的 timeout 被告知"IndexTTS 卡死"很误导。
 * 修复：调用方传 `context` 说明"这次调用的第三方是谁"，没传时默认 "第三方服务"。
 *
 * @param error      axios 抛的 Error（或类似的 {response,code,message} 对象）
 * @param context    可选：本次调用的服务描述（如 'OpenAI 兼容端点（OpenAI/火山方舟）'），
 *                   用于 timeout 文案。不传默认 "第三方服务"。
 */
/**
 * 把后端返回的 detail 归一化成**字符串**。
 *
 * FastAPI 的校验失败（422）返回的是**数组**：
 *   {"detail":[{"loc":["body","slug"],"msg":"Field required","type":"missing"}]}
 * 原实现直接 `if (detail) return detail`，于是数组一路传到 toast.push() 的
 * `message.trim()` → TypeError → React 整页白屏。实测路径：标签管理页「新建标签」
 * 必现（前端不发 slug，后端 slug 必填）。
 *
 * 数组 detail 还会顺带触发第二个更糟的后果：TypeError 顶上原始 422 之后，
 * catch 收到的对象没有 .response，toErrorMessage 一路走到最后显示
 * "无法连接 api-gateway" —— 把排查方向从「参数写错了」带到「网关没启动」。
 */
function normalizeDetail(detail: unknown): string | null {
  if (detail == null) return null
  if (typeof detail === 'string') return detail.trim() || null
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const loc = Array.isArray((item as any).loc)
          ? (item as any).loc.filter((p: unknown) => p !== 'body' && p !== 'query').join('.')
          : ''
        const msg = typeof (item as any).msg === 'string' ? (item as any).msg : JSON.stringify(item)
        return loc ? `${loc}: ${msg}` : msg
      }
      return String(item)
    })
    return parts.join('；') || null
  }
  if (typeof detail === 'object') {
    const msg = (detail as any).message ?? (detail as any).msg
    return typeof msg === 'string' ? msg : null
  }
  return String(detail)
}

export function toErrorMessage(error: unknown, context?: string): string {
  const err = error as {
    response?: { status?: number; data?: { message?: string; detail?: string } }
    code?: string
    message?: string
    config?: { timeout?: number }
  }
  const status = err?.response?.status
  const detail =
    normalizeDetail(err?.response?.data?.message) ?? normalizeDetail(err?.response?.data?.detail)
  if (detail) return detail
  if (status === 404 || status === 501) return '端点不存在（404 / 501）'
  if (status === 401) return '登录已失效，请重新登录'
  if (status === 403) return '无权限访问该资源'
  if (status === 429) return '请求过于频繁，请稍后再试'
  if (status && status >= 500) return `服务端错误（${status}）`
  if (status) return `请求失败（${status}）`
  // 无 status → 没拿到 response，区分超时 vs 网关不可达
  const target = context?.trim() || '第三方服务'
  if (err?.code === 'ECONNABORTED') {
    // 超时秒数取**这次请求实际的** timeout，而不是全局常量 ——
    // 有些端点会单独放宽（比如音色试听要真跑 oMLX 合成，实测 ~120s，
    // 见 src/api/admin/voice-library.ts 的 PREVIEW_TIMEOUT_MS）。
    // 照抄 API_TIMEOUT_SEC 会让「等了 180 秒后超时」显示成「请求超时（15s）」，
    // 自相矛盾且会把排查方向带偏。
    const actual = (err as { config?: { timeout?: number } })?.config?.timeout
    const sec = Math.round((typeof actual === 'number' && actual > 0 ? actual : API_TIMEOUT_SEC * 1000) / 1000)
    return `请求超时（${sec}s）—— ${target}可能卡死或未启动，请检查后重试`
  }
  return '无法连接 api-gateway（http://localhost:8100），请检查网关是否启动'
}

/**
 * axios 超时秒数（client.ts:apiClient.timeout = 15000）。
 * toErrorMessage 用它拼 timeout 文案，单点维护避免再次漂移。
 *
 * 可被 VITE_API_TIMEOUT_MS 环境变量覆盖（毫秒）；admin-web 是纯浏览器代码，没有 node 的
 * process 全局，所以走 `globalThis as any`。
 */
export const API_TIMEOUT_SEC = Math.round(
  Number(
    (globalThis as { process?: { env?: Record<string, string> } }).process?.env
      ?.VITE_API_TIMEOUT_MS,
  ) || 15000,
) / 1000

export default apiClient
