import type { ReactNode } from 'react'

/* ------------------------------- 骨架屏 / Loading ------------------------------ */

/**
 * 通用骨架条（0 依赖手写，不引第三方 UI 库）。
 *
 * 传 className 控制宽高，例如 `<Skeleton className="h-4 w-32" />`。
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-gray-200 dark:bg-slate-700 ${className}`}
    />
  )
}

/**
 * 表格骨架屏 —— 默认 5 行灰条。
 *
 * 用单行整宽灰条模拟加载中的表格体，避免列宽抖动。
 */
export function TableSkeleton({
  rows = 5,
  colSpan,
}: {
  rows?: number
  colSpan: number
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className={rowClass}>
          <td colSpan={colSpan} className="px-4 py-4">
            <Skeleton className="h-4 w-full" />
          </td>
        </tr>
      ))}
    </>
  )
}

/** 指标卡骨架屏 */
export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={i === 0 ? 'h-7 w-20' : 'h-3 w-24'} />
      ))}
    </div>
  )
}

/** 空态行 */
export function EmptyRow({ colSpan, text = '暂无数据' }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-10 text-center text-gray-400 dark:text-slate-500"
      >
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
          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
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
          className="ml-4 shrink-0 rounded border border-current px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-white/10"
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
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-slate-800"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 text-gray-700 dark:text-slate-200">{children}</div>
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
      <span className="block text-sm font-medium text-gray-700 dark:text-slate-300">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

export const inputClass =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:ring-slate-400'

export const buttonPrimaryClass =
  'rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:focus-visible:ring-slate-400'

export const buttonGhostClass =
  'rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-400'

/* ------------------------------ 暗色模式共享样式 ------------------------------ */

export const pageTitleClass =
  'text-2xl font-bold text-gray-900 dark:text-slate-100'

export const pageHintClass = 'mt-1 text-sm text-gray-500 dark:text-slate-400'

export const tableWrapClass =
  'mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'

export const theadClass =
  'bg-gray-50 text-gray-500 dark:bg-slate-900/60 dark:text-slate-400'

export const thClass = 'px-4 py-3 font-medium whitespace-nowrap'

export const rowClass = 'border-t border-gray-100 dark:border-slate-700'

export const cellMutedClass = 'px-4 py-3 text-gray-500 dark:text-slate-400'

export const cellTextClass = 'px-4 py-3 text-gray-600 dark:text-slate-300'

export const cellStrongClass = 'px-4 py-3 text-gray-900 dark:text-slate-100'

export const footerCountClass = 'mt-3 text-xs text-gray-400 dark:text-slate-500'

/** 状态徽标 */
export function Badge({ value }: { value?: string | null }) {
  const text = value ?? '—'
  const tone =
    text === 'active' || text === 'completed' || text === 'sent'
      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
      : text === 'failed' || text === 'suspended' || text === 'deleted'
        ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
        : text === 'pending' || text === 'processing' || text === 'queued'
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${tone}`}>
      {text}
    </span>
  )
}

