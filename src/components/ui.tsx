import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
        {missing ? '端点未上线：' : ''}
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

/* ─────────────────────────────────────────────────────────
   CP-NEW.1 听感运营重构 —— 新增 UI 组件
   听匣 Design System：安静 / 留白 / 工具感（沿用 warm-gray 系列 + .t-tabs motion token）
───────────────────────────────────────────────────────── */

/* ── SlidingTabs ─────────────────────────────────────────────── */

/** 通用 tabs 滑动切换 —— 复用 index.css 的 .t-tabs motion（250ms ease-out）。
 *
 * 用于听感池页 (FewShotPool) 的「健康度+列表 / 清理+抽查」切换等场景。
 * 受控：active 由外部 state 管，切换时调用 onChange(key)。
 */
export interface SlidingTabItem<T extends string> {
  key: T
  label: string
}

export function SlidingTabs<T extends string>({
  items,
  active,
  onChange,
}: {
  items: SlidingTabItem<T>[]
  active: T
  onChange: (key: T) => void
}) {
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeIndex = items.findIndex((i) => i.key === active)
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  })

  useLayoutEffect(() => {
    const el = tabsRef.current[activeIndex]
    const container = containerRef.current
    if (!el || !container) return
    const elRect = el.getBoundingClientRect()
    const cRect = container.getBoundingClientRect()
    setPillStyle({ left: elRect.left - cRect.left, width: elRect.width })
  }, [activeIndex, items])

  return (
    <div ref={containerRef} className="t-tabs" role="tablist">
      <span
        className="t-tabs-pill"
        aria-hidden="true"
        style={{ transform: `translateX(${pillStyle.left}px)`, width: pillStyle.width }}
      />
      {items.map((item, idx) => (
        <button
          key={item.key}
          ref={(el) => {
            tabsRef.current[idx] = el
          }}
          type="button"
          role="tab"
          aria-selected={item.key === active}
          onClick={() => onChange(item.key)}
          className="t-tab"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

/* ── Stepper ─────────────────────────────────────────────── */

/** 步骤进度条 —— 横向圆点 + 横线，激活态用 warm-ochre。
 *
 * 比 SlidingTabs 更轻量：用于盲测 / 池抽查等「多步工作流」顶部展示进度。
 * 不可点击，仅展示当前进度（activeIndex 由 useStepper 控制）。
 */
export interface StepperStep {
  key: string
  label: string
}

export function Stepper({
  steps,
  activeIndex,
}: {
  steps: StepperStep[]
  activeIndex: number
}) {
  return (
    <ol
      className="flex w-full items-center gap-0"
      aria-label="工作流步骤"
      role="list"
    >
      {steps.map((step, idx) => {
        const done = idx < activeIndex
        const current = idx === activeIndex
        const isLast = idx === steps.length - 1
        const dotClass = done
          ? 'bg-warm-ochre text-cream'
          : current
            ? 'border-warm-ochre bg-neutral-50 text-warm-ochre'
            : 'border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500'
        const labelClass = done || current
          ? 'text-ink dark:text-neutral-100'
          : 'text-neutral-400 dark:text-neutral-500'

        return (
          <li
            key={step.key}
            aria-current={current ? 'step' : undefined}
            className={`flex items-center ${isLast ? '' : 'flex-1'}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${dotClass}`}
              >
                {done ? '✓' : idx + 1}
              </span>
              <span className={`text-sm ${labelClass}`}>{step.label}</span>
            </div>
            {!isLast && (
              <div className="mx-3 h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ── ReasonDialog ─────────────────────────────────────────────── */

/** 危险操作前的 reason 输入弹窗。
 *
 * 后端契约：reason ≥ 5 字符（force-retry / delete / cleanup 等）。
 * 前端在「提交」按钮前做长度校验，避免无意义回弹。
 *
 * confirmTone='danger' 红色（删除/用色），'primary' 默认主色。
 */
export interface ReasonDialogProps {
  open: boolean
  title: string
  description?: string
  placeholder?: string
  minLength?: number
  confirmLabel?: string
  confirmTone?: 'danger' | 'primary'
  submitting?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void | Promise<void>
}

export function ReasonDialog({
  open,
  title,
  description,
  placeholder = '请输入操作原因（≥5 字符，写入审计日志）',
  minLength = 5,
  confirmLabel = '确认',
  confirmTone = 'danger',
  submitting = false,
  onClose,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) setReason('')
  }, [open])

  if (!open) return null

  const trimmed = reason.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < minLength
  const disabled = submitting || trimmed.length < minLength

  const handleConfirm = async () => {
    if (disabled) return
    await onConfirm(trimmed)
  }

  const confirmClass =
    confirmTone === 'danger'
      ? 'rounded-md bg-error px-4 py-2 text-sm font-medium text-cream hover:bg-error/90 disabled:opacity-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2'
      : buttonPrimaryClass

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
        <div className="px-5 py-4 space-y-3">
          {description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {description}
            </p>
          )}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className={`${inputClass} resize-none ${
              tooShort ? 'border-error/60 focus:border-error' : ''
            }`}
          />
          <div className="flex items-center justify-between text-xs">
            <span
              className={
                tooShort
                  ? 'text-error'
                  : trimmed.length >= minLength
                    ? 'text-success'
                    : 'text-neutral-400 dark:text-neutral-500'
              }
            >
              {trimmed.length < minLength
                ? `还需 ${minLength - trimmed.length} 字符`
                : '✓ 长度合规'}
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3 dark:border-neutral-700">
          <button type="button" className={buttonGhostClass} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={handleConfirm}
            disabled={disabled}
          >
            {submitting ? '提交中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── MetricCard ─────────────────────────────────────────────── */

/** 多指标展示卡 —— A3 agreement / A5 多码率 / A4 ab-report 都用。
 *
 * metrics 数组每项 {key, label, value, unit?, tone?: 'success'|'warning'|'error'|'muted'}，
 * value=null 显示 '—'（与 DistillMetrics 的 MetricCard 行为对齐）。
 */
export interface MetricItem {
  key: string
  label: string
  value: number | null
  unit?: string
  /** null 时强制 muted；显式 tone 覆盖 */
  tone?: 'success' | 'warning' | 'error' | 'muted'
}

export function MetricCard({
  label,
  metrics,
  loading,
}: {
  label: string
  metrics: MetricItem[]
  loading?: boolean
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
      {loading ? (
        <div className="mt-3 space-y-2">
          {metrics.map((m) => (
            <Skeleton key={m.key} className="h-5 w-24" />
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-1">
          {metrics.map((m) => {
            const tone =
              m.value === null
                ? 'text-neutral-400 dark:text-neutral-500'
                : m.tone === 'success'
                  ? 'text-success'
                  : m.tone === 'warning'
                    ? 'text-warning'
                    : m.tone === 'error'
                      ? 'text-error'
                      : 'text-ink dark:text-neutral-100'
            const display =
              m.value === null
                ? '—'
                : m.unit === '%'
                  ? `${m.value.toFixed(2)}%`
                  : m.unit
                    ? `${m.value.toFixed(2)} ${m.unit}`
                    : m.value.toFixed(2)
            return (
              <div key={m.key} className="flex items-baseline gap-1">
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {m.label}
                </span>
                <span className={`font-serif text-xl font-semibold ${tone}`}>
                  {display}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── CaveatBanner ─────────────────────────────────────────────── */

/** 强制展示的 caveat / warning 条 —— 黄色 warning / 红色 danger。
 *
 * 用于 ab-report 的 caveats（红色，必须展示的硬约束）
 * 和 tier-config 的 warnings（黄色，防止运营配错 provider）。
 */
export function CaveatBanner({
  items,
  variant = 'warning',
  title,
}: {
  items: string[]
  variant?: 'warning' | 'danger'
  title?: string
}) {
  if (items.length === 0) return null

  const tone =
    variant === 'danger'
      ? 'border-error/30 bg-error/5 text-error'
      : 'border-warning/30 bg-warning/5 text-warning'

  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={`mt-4 rounded-md border px-4 py-3 text-sm ${tone}`}
    >
      {title && <div className="mb-1 font-medium">{title}</div>}
      <ul className="list-disc space-y-1 pl-4">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
