import type { ReactNode } from 'react'

/** 表格骨架屏 */
export function Loading({ rows = 4, colSpan }: { rows?: number; colSpan: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t border-gray-100">
          <td colSpan={colSpan} className="px-4 py-4">
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  )
}

/** 空态行 */
export function EmptyRow({ colSpan, text = '暂无数据' }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-gray-400">
        {text}
      </td>
    </tr>
  )
}

/**
 * 错误提示条。
 *
 * `missing` 为 true 时表示端点未上线（404 / 网关不可达），
 * 此时提示“功能待上线”，不阻塞页面其他内容。
 */
export function ErrorNotice({
  message,
  missing = false,
  onRetry,
}: {
  message: string
  missing?: boolean
  onRetry?: () => void
}) {
  return (
    <div
      className={`mt-6 flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
        missing
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      <span>
        {missing ? '功能待上线：' : ''}
        {message}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-4 shrink-0 rounded border border-current px-3 py-1 text-xs hover:bg-white/60"
        >
          重试
        </button>
      )}
    </div>
  )
}

/** 轻量弹窗（无第三方 UI 库） */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

/** 表单字段包装 */
export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

export const inputClass =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none'

export const buttonPrimaryClass =
  'rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors'

export const buttonGhostClass =
  'rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors'

/** 状态徽标 */
export function Badge({ value }: { value?: string | null }) {
  const text = value ?? '—'
  const tone =
    text === 'active' || text === 'completed' || text === 'sent'
      ? 'bg-green-50 text-green-700'
      : text === 'failed' || text === 'suspended' || text === 'deleted'
        ? 'bg-red-50 text-red-700'
        : text === 'pending' || text === 'processing' || text === 'queued'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-gray-100 text-gray-600'

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${tone}`}>
      {text}
    </span>
  )
}

/** 时间戳格式化（后端返回 ISO 字符串，异常值原样返回） */
export function formatTime(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return '—'
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { hour12: false })
}

/** 数字格式化 */
export function formatNumber(value?: number | null): string {
  if (value === undefined || value === null) return '—'
  return value.toLocaleString('zh-CN')
}
