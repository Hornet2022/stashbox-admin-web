import { API_BASE_URL, ADMIN_API_PREFIX, getAuthToken } from '../client'

/**
 * CSV 导出 —— GET /admin/export/{kind}.csv。
 *
 * 通过 window.location.href 直链下载（避免 axios 解析 CSV 文本成 JSON）。
 * cookie 鉴权由浏览器自动带上；附 token 查询参数兼容纯 token 场景。
 *
 * CP-NEW.15：从老 api/admin.ts 拆出。
 */

export type ExportKind =
  | 'users'
  | 'articles'
  | 'tags'
  | 'audit-log'
  | 'feedback'
  | 'subscriptions'

export function exportCsvUrl(kind: ExportKind): string {
  const token = getAuthToken()
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${API_BASE_URL}${ADMIN_API_PREFIX}/export/${kind}.csv${query}`
}

/** 触发下载（返回实际使用的 URL，便于测试 / 断言） */
export function downloadCsv(kind: ExportKind): string {
  const url = exportCsvUrl(kind)
  window.location.href = url
  return url
}