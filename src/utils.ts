/** 时间戳格式化（后端返回 ISO 字符串，异常值原样返回） */
export function formatTime(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { hour12: false })
}

/** 数字格式化 */
export function formatNumber(value?: number | null): string {
  if (value === undefined || value === null) return '—'
  return value.toLocaleString('zh-CN')
}
