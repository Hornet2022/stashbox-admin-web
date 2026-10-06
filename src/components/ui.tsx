import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { DEFAULT_BADGE_LABELS } from '../constants/labels'

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
          ? 'border-warning/30 bg-warning/10 text-warning-ink'
          : 'border-error/30 bg-error/10 text-error-ink'
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
        // max-h + overflow 不可省：这个弹窗是居中（items-center）的，
        // 内容一旦高过视口，上下会被**对称地裁掉**。VoiceLibrary 的编辑
        // 弹窗有 5 组字段（含一个 rows={3} 的 textarea），375×667 上
        // 顶部的「音色名称」和底部的「取消/保存」会同时消失，
        // 既不能填完也不能取消 —— 任务直接卡死。
        // 2rem = 上下各 8px，正好对上遮罩的 p-4。
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-lg border border-neutral-200 bg-neutral-50 shadow-md dark:border-neutral-700 dark:bg-neutral-800"
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

/**
 * 区块标题（页面内 h2）。
 *
 * 抽成常量是因为它之前是分裂的：20 处写 `font-serif text-base font-semibold`，
 * 4 处（Dashboard ×3、DistillMetrics ×1）写 `text-sm font-semibold` 无衬线。
 * 同一个角色、两种字号、两种字族 —— 而页面标题是 font-serif text-xl（20px），
 * 14px 无衬线的 h2 挂在它下面只有 6px 落差，还换了字族，
 * 读起来像「碰巧加粗的正文」而不是一个区块，用户没法把一页扫成几段。
 * 现在统一走这里，层级只剩「页标题 20 / 区块 16」两级。
 */
export const sectionTitleClass =
  'font-serif text-base font-semibold text-ink dark:text-neutral-100'

/**
 * 页面标题（h1）。
 *
 * 20px → 24px：内容列在 1920px 下宽 1400px，20px 的 h1 站在上面几乎不显；
 * 更要紧的是它比不过 StatCard 里的 28px 数字 —— 数字比标题还大，
 * 层级是反的。24px 让「页标题 24 / 区块 16 / 卡片数字 28-30」里
 * 卡片数字作为视觉主角这件事变成**有意的**，而不是因为标题太小才显出来。
 */
export const pageTitleClass =
  'font-serif text-2xl font-semibold text-ink dark:text-neutral-100'

// max-w-2xl 不可省：内容列在 1920px 下宽 1400px（Layout.tsx 的 max-w-[1400px]），
// 一行 CJK 铺满 1400px 时回视要来回扫，一屏读不完。
// PageHeader 早就把这个上限带上了（ui.tsx:682 的 max-w-2xl），
// 而 8 个页面用的是这个裸常量，于是同一份「页面副标题」有两种排版。
export const pageHintClass =
  'mt-1 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400'

/**
 * 表格外层。
 *
 * 原来是 `overflow-hidden`：内容比容器宽时直接**裁掉**，右边几列（含操作列）
 * 永远看不见，而且连滚动条都没有 —— 运营既发现不了、也够不着。
 * 改成 overflow-x-auto 后至少可以横向拖动看到。
 */
export const tableWrapClass =
  'mt-6 overflow-x-auto overscroll-x-contain rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50'

export const theadClass =
  'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'

/* 去掉 uppercase + tracking：这张表渲染的表头是中文
   （Tags 的 订阅数/创建时间、VoiceLibrary 的 音色/标识/状态、
   AuditLog、PushNotifications…），见 'ALREADY STRONG' 里记住的同款结论。 */
export const thClass = 'px-4 py-3 text-left text-xs font-medium whitespace-nowrap'

export const rowClass = 'border-t border-neutral-100 dark:border-neutral-700/60'

export const cellMutedClass = 'px-4 py-3 text-sm text-neutral-400 dark:text-neutral-500'

export const cellTextClass = 'px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300'

export const cellStrongClass = 'px-4 py-3 text-sm font-medium text-ink dark:text-neutral-100'

export const footerCountClass = 'mt-3 text-xs text-neutral-400 dark:text-neutral-500'

/* ── Badge ────────────────────────────────────────────── */

/* ⚠ Tailwind 的 opacity 刻度只有 0/5/10/15/20/25/30/…/100。这里的 /12 和 /8 **不在刻度里**，类会被静默丢弃 —— 编译产物里grep 不到任何对应规则。也就是说这个 tint 底色从来没生效过，徽标只剩一行浮着的彩色文字，「药丸」这个形本身不存在了。实测：`bg-success/12` `bg-error/12` `bg-error/8` `bg-warm-ochre/12` `bg-[#B87070]/12` 全部 0 处；同文件里的 `/10` `/15` 正常生成。*/
const BADGE_TONE: Record<string, string> = {
  // 底色 tint 用语义色本身，文字用同色相压暗的 *-ink（米白底 5.10:1 / 5.44:1 / 5.25:1）。
  // 之前文字直接用语义色：success 3.24:1、error 3.36:1，都不到 4.5:1，
  // 而徽标是 12px 的小字 —— 全站每一个状态徽标都在 AA 线以下。
  good: 'bg-success/10 text-success-ink',
  bad: 'bg-error/10 text-error-ink',
  warn: 'bg-warning/15 text-warning-ink',
  muted: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
}

/**
 * 状态徽标。
 *
 * 之前直接把内部枚举值原样印出来（`active` / `pending` / `failed`），
 * 整页中英文混排。这一版默认过一遍 `constants/labels.ts` 的映射表，
 * 显示运营看得懂的中文；映射表里没有的值才回落到原文
 * —— 宁可显示 `douyin` 也不要显示空白，运营至少能拿这个词去问人。
 */
export function Badge({
  value,
  map,
}: {
  value?: string | null
  map?: Record<string, { label: string; tone?: string }>
}) {
  const raw = value ?? ''
  // 默认查全站合并表；页面有专属语义时用 map 覆盖。
  const lookup = map ?? DEFAULT_BADGE_LABELS
  const meta = raw ? lookup[raw] : undefined
  const text = raw ? (meta?.label ?? raw) : '—'

  // 色调优先级：映射表自带的 tone > 原始值的语义判定。
  // 之前只按原始值判，于是 `enabled`（已开启）落进兜底的灰色 ——
  // 「开」和「关」看起来一样，扫一列区分不出状态。
  const TONE_BY_KEY: Record<string, string> = {
    sage: BADGE_TONE.good,
    amber: BADGE_TONE.warn,
    clay: BADGE_TONE.bad,
    stone: BADGE_TONE.muted,
  }
  const toneClass =
    (meta?.tone && TONE_BY_KEY[meta.tone]) ||
    (raw === 'active' || raw === 'completed' || raw === 'sent' || raw === 'done' || raw === 'ok'
      ? BADGE_TONE.good
      : raw === 'failed' || raw === 'suspended' || raw === 'deleted' || raw === 'over_quota'
        ? BADGE_TONE.bad
        : raw === 'pending' || raw === 'processing' || raw === 'queued' || raw === 'distilling'
          ? BADGE_TONE.warn
          : BADGE_TONE.muted)

  return (
    <span
      role="status"
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}
    >
      {text}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────
   CP-NEW.1 听感运营重构 —— 新增 UI 组件
   听匣 Design System：安静 / 留白 / 工具感（沿用 neutral 系列 + .t-tabs motion token）
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
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium transition-colors duration-[250ms] ${dotClass}`}
              >
                {done ? '✓' : idx + 1}
              </span>
              <span
                className={`text-sm transition-colors duration-[250ms] ${labelClass}`}
              >
                {step.label}
              </span>
            </div>
            {/* 2026-10-03：连接线原来是**写死的灰**，done 从不碰它，
                Stepper 里也没有任何 transition —— 每按一次「下一步」，
                圆点填色和文字变色是瞬时的，而三个组件之外的 tab 指示块
                却在走 250ms 缓动。同一个 App 里两种节奏。
                更可惜的是这根线本该是唯一能表达「走了多远」的元素：
                灰线永远不变，于是「我在第几步」只能靠数圆点。
                改成有状态且有动画：走过的段落铺成暖赭色。 */}
            {!isLast && (
              <div className="mx-3 h-0.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className={`h-full origin-left rounded-full bg-warm-ochre transition-transform duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                    done ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </div>
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
                  ? 'text-error-ink'
                  : trimmed.length >= minLength
                    ? 'text-success-ink'
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
  /** 可选 —— 调用方已有自己的 h2/h3 标题时传 null 或留空，避免双层标题 */
  label?: string | null
  metrics: MetricItem[]
  loading?: boolean
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
      {label ? (
        <div className="text-sm text-neutral-500 dark:text-neutral-400">{label}</div>
      ) : null}
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
                  ? 'text-success-ink'
                  : m.tone === 'warning'
                    ? 'text-warning-ink'
                    : m.tone === 'error'
                      ? 'text-error-ink'
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
      ? 'border-error/30 bg-error/5 text-error-ink'
      : 'border-warning/30 bg-warning/5 text-warning-ink'

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

/* ══════════════════════════════════════════════════════════════════
   共享原语 —— 17 个页面共用，页面不再各自手搓页头/指标卡/下拉框
══════════════════════════════════════════════════════════════════ */

/* ── PageHeader ──────────────────────────────────────────────────── */

/**
 * 页头：标题 + **说人话**的副标题 + 右侧操作区。
 *
 * 副标题原来写的是「数据源：GET /api/v1/admin/stats（Redis 30s 缓存）」
 * 这种内部实现 —— 运营看不懂也不需要知道，但整页都是这种黑话，
 * 页面读起来像后端调试面板而不是产品。
 * 现在只接受业务语义的话；要排障就去看接口文档或审计日志。
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string
  /** 一句话说明这页在回答什么问题。业务语言，不是端点路径。 */
  description?: ReactNode
  actions?: ReactNode
  /** 右侧的轻量元信息（数据新鲜度、缓存状态等），不抢主标题的注意力 */
  meta?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className={pageTitleClass}>{title}</h1>
        {description && (
          <div className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {description}
          </div>
        )}
        {meta && <div className="mt-2">{meta}</div>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  )
}

/* ── StatCard ────────────────────────────────────────────────────── */

export type StatTone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent'

/**
 * 指标卡 —— 一屏 8 个等权重的卡等于没有层级。
 *
 * 层级规则：**值最大、说明最小**。label 是上下文（小号、低对比），
 * value 是主角（大号、tabular-nums、等宽对齐），脚注是可选项。
 * 之前 8 张卡 label 和脚注同样大小同样颜色，扫视时眼睛找不到落点。
 */
export function StatCard({
  label,
  value,
  unit,
  footnote,
  tone = 'neutral',
  emphasis = false,
  loading = false,
}: {
  label: ReactNode
  value: ReactNode
  unit?: string
  /** 口径说明。用来解释「这个数怎么来的」，不是 API 路径。 */
  footnote?: ReactNode
  tone?: StatTone
  /** emphasis = 这张卡是本页主角（例如积压的失败数），给暖赭左边框 */
  emphasis?: boolean
  loading?: boolean
}) {
  const toneText: Record<StatTone, string> = {
    neutral: 'text-ink dark:text-neutral-100',
    good: 'text-success-ink',
    warn: 'text-warning-ink',
    bad: 'text-error-ink',
    accent: 'text-warm-ochre',
  }
  return (
    <div
      className={[
        'relative overflow-hidden rounded-lg border bg-neutral-50 p-4 dark:bg-neutral-800/50',
        emphasis
          ? 'border-warm-ochre/40 border-l-[3px]'
          : 'border-neutral-200 dark:border-neutral-700',
      ].join(' ')}
    >
      {/* uppercase + tracking 打在中文上，两件事都不该做：
   uppercase 对汉字是空操作；正字距在汉字上是排版错误 —— 汉字设计时
   就占满一个 em 字身框，字间塞空会破坏阅读节奏，短标签看着像撑开的
   占位符。分组层级靠字号、字重和颜色来分，不靠字距。 */}
      <div className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
        {label}
      </div>
      {loading ? (
        <div className="mt-2 space-y-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ) : (
        <div className="mt-1.5 flex items-baseline gap-1">
          <span
            className={`tnum-clip font-serif text-3xl font-semibold leading-none ${toneText[tone]}`}
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">{unit}</span>
          )}
        </div>
      )}
      {footnote && !loading && (
        <div className="mt-1.5 truncate text-xs text-neutral-400 dark:text-neutral-500">
          {footnote}
        </div>
      )}
    </div>
  )
}

/* ── Select ──────────────────────────────────────────────────────── */

const selectTriggerClass =
  'inline-flex w-full items-center justify-between gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-ink transition-colors hover:border-neutral-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-ochre/40 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'

/**
 * 自定义下拉 —— 替换原生 <select>。
 *
 * 原生 select 的展开面板完全不受控：macOS 是系统毛玻璃圆角、
 * Windows 是蓝色高亮、Android Chrome 是 Material 列表，三端三种长相，
 * 和后台其余部分（1px 细边框、暖赭焦点环）根本不是一套东西。
 * 原生控件还会在窄容器里把文字截成「邮箱 /」这种半截词。
 */
export function Select({
  value,
  onChange,
  options,
  label,
  className = '',
  placeholder = '请选择',
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  label?: string
  className?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = options.find((o) => o.value === value)

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && (
        <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </label>
      )}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={selectTriggerClass}
      >
        <span className={`t-clamp-1 ${current ? '' : 'text-neutral-400'}`}>
          {current?.label ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-neutral-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label ?? '选项'}
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-md dark:border-neutral-600 dark:bg-neutral-800"
        >
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={[
                  'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                  o.value === value
                    ? 'bg-warm-ochre/10 font-medium text-ink dark:bg-warm-ochre/15 dark:text-neutral-100'
                    : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700',
                ].join(' ')}
              >
                <span className="t-clamp-1">{o.label}</span>
                {o.value === value && <Check size={13} className="shrink-0 text-warm-ochre" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Table 容器 ──────────────────────────────────────────────────── */

/** 表格外层：窄屏时横向滚动，而不是把列挤出容器让人看不见。 */
export function TableScroll({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 overflow-x-auto overscroll-x-contain rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="min-w-max">{children}</div>
    </div>
  )
}

/** 窄屏可隐藏的次要列。状态/操作这类主列绝不能加。 */
export const colSecondary = 'hidden lg:table-cell'
export const colTertiary = 'hidden xl:table-cell'

/** 空态：整块居中的提示，而不是一行居中的「暂无数据」。 */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</div>
      {hint && (
        <div className="max-w-sm text-xs leading-relaxed text-neutral-400 dark:text-neutral-500">
          {hint}
        </div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** 行内小按钮。表格里每行都有多个动作，用它统一形态。 */
export function ButtonGhost({
  children,
  onClick,
  disabled,
  title,
  variant = 'default',
  className = '',
  ...rest
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
  variant?: 'default' | 'danger'
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'title'>) {
  const base =
    'inline-flex items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40'
  const tone =
    variant === 'danger'
      // hover 底色原来是 hover:bg-error/8 —— 8 不在 Tailwind 刻度里，
      // 这个类不生成，于是这个「危险」按钮**没有任何 hover 填充**，
      // 只挪边框和字色，是误点代价最高的一类控件上最弱的反馈。
      ? 'border-error/30 text-error-ink hover:border-error/50 hover:bg-error/10'
      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100 hover:text-ink dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${tone} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ── 格式化工具 ──────────────────────────────────────────────────── */

/** 时长：按量级自动换算，避免出现「16666666666666668.0min」这种不可读的东西。 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—'
  const s = Math.abs(seconds)
  if (s < 1) return `${(seconds * 1000).toFixed(0)} 毫秒`
  if (s < 60) return `${Number(seconds.toFixed(1))} 秒`
  if (s < 3600) return `${Number((seconds / 60).toFixed(1))} 分钟`
  if (s < 86400) return `${Number((seconds / 3600).toFixed(1))} 小时`
  return `${Number((seconds / 86400).toFixed(1))} 天`
}

/** 相对时间：比「0 秒前更新」像人话。 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (diffSec < 10) return '刚刚'
  if (diffSec < 60) return `${diffSec} 秒前`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`
  return `${Math.floor(diffSec / 86400)} 天前`
}

/** 长 ID 只展示有辨识度的中间一段：`art_66cb…7b7`。 */
export function shortId(id: string | number | null | undefined, keep = 6): string {
  if (id === null || id === undefined || id === '') return '—'
  const parts = String(id).split('_')
  if (parts.length > 1) {
    const [prefix, rest] = parts
    if (rest.length <= keep * 2) return String(id)
    return `${prefix}_${rest.slice(0, keep)}…${rest.slice(-keep)}`
  }
  const full = String(id)
  if (full.length <= keep * 2) return full
  return `${full.slice(0, keep)}…${full.slice(-keep)}`
}
