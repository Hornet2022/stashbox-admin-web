import type { ReactNode } from 'react'

/* ─────────────────────────────────────────────────────────
   听匣 Design System — Shared UI Components
   安静 / 留白 / 工具感
───────────────────────────────────────────────────────── */

/* ── Skeleton ──────────────────────────────────────────── */

/**
 * 通用骨架条。
 * 传 className 控制宽高，例如 `<Skeleton className="h-4 w-32" />`。
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-neutral-200 dark:bg-neutral-700 ${className}`}
    />
  )
}

/**
 * 表格骨架屏 —— 默认 5 行灰条。
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
        className="px-4 py-10 text-center text-neutral-400 dark:text-neutral-500"
      >
        {text}
      </td>
    </tr>
  )
}

/* ── Error / Notice ──────────────────────────────────── */

/**
 * 错误提示条。
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
      className={`mt-6 flex items-center justify-between rounded-md border px-4 py-3 text-sm ${
        missing
          ? 'border-warning/30 bg-warning/10 text-warning'
          : 'border-error/30 bg-error/10 text-error'
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
          className="ml-4 shrink-0 rounded border border-current px-3 py-1 text-xs hover:bg-white/20 dark:hover:bg-black/10"
        >
          重试
        </button>
      )}
    </div>
  )
}

/* ── Modal ───────────────────────────────────────────── */

/** 轻量弹窗 */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-neutral-200 bg-neutral-50 shadow-md dark:border-neutral-700 dark:bg-neutral-800"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
          <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200"
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 text-neutral-600 dark:text-neutral-200">{children}</div>
      </div>
    </div>
  )
}

/* ── Form ────────────────────────────────────────────── */

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
      <span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

/* ── Input / Button Classes ───────────────────────────── */

export const inputClass =
  'w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-ink placeholder:text-neutral-400 focus:border-warm-ochre focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-ochre/30 focus-visible:ring-offset-1 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-warm-ochre/40'

export const buttonPrimaryClass =
  'rounded-md bg-ink px-4 py-2 text-sm font-medium text-cream hover:bg-neutral-700 disabled:opacity-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-warm-ochre focus-visible:ring-offset-2 dark:bg-neutral-100 dark:text-ink dark:hover:bg-white dark:focus-visible:ring-warm-ochre'

export const buttonGhostClass =
  'rounded-md border border-neutral-200 bg-transparent px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:focus-visible:ring-neutral-500'

/* ── Page Shared ──────────────────────────────────────── */

export const pageTitleClass =
  'font-serif text-xl font-semibold text-ink dark:text-neutral-100'

export const pageHintClass = 'mt-1 text-sm text-neutral-500 dark:text-neutral-400'

export const tableWrapClass =
  'mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50'

export const theadClass =
  'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'

export const thClass = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap'

export const rowClass = 'border-t border-neutral-100 dark:border-neutral-700/60'

export const cellMutedClass = 'px-4 py-3 text-sm text-neutral-400 dark:text-neutral-500'

export const cellTextClass = 'px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300'

export const cellStrongClass = 'px-4 py-3 text-sm font-medium text-ink dark:text-neutral-100'

export const footerCountClass = 'mt-3 text-xs text-neutral-400 dark:text-neutral-500'

/* ── Badge ────────────────────────────────────────────── */

/** 状态徽标 — 低饱和度语义色 */
export function Badge({ value }: { value?: string | null }) {
  const text = value ?? '—'
  const tone =
    text === 'active' || text === 'completed' || text === 'sent'
      ? 'bg-success/10 text-success'
      : text === 'failed' || text === 'suspended' || text === 'deleted'
        ? 'bg-error/10 text-error'
        : text === 'pending' || text === 'processing' || text === 'queued'
          ? 'bg-warning/10 text-warning'
          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'

  return (
    <span role="status" className={`inline-block rounded px-2 py-0.5 text-xs ${tone}`}>
      {text}
    </span>
  )
}
