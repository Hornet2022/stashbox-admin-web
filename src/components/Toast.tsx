import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Info, TriangleAlert, X } from 'lucide-react'
import { TOAST_DURATION, useToastStore, type ToastKind } from '../store/toast'

/**
 * Toast 渲染容器 —— 挂在 App.tsx 顶层，全局生效。
 *
 * 纯手写（无 sonner / 无第三方 UI 库），样式走 Tailwind。
 *
 * 三个改动：
 * 1. **进出动效**。之前是瞬时出现、瞬时消失 —— 点「删除」之后唯一的反馈
 *    没有任何过渡，扫视的人会以为界面卡了。现在入场右滑淡入、退场左滑
 *    淡出，并且退场期间组件仍挂载（先播完动画再摘掉）。
 * 2. **倒计时进度条**。3.2 秒后自动消失，但此前没有任何提示，用户不知道
 *    这条信息还剩多久、是不是已经没了。底部一条 2px 的进度线同时充当
 *    品牌色点缀。
 * 3. **配色回归设计系统**。原来用 Tailwind 的 green-50 / red-50 /
 *    slate-800，是脚手架默认色，和「暖赭 + 纸感中性」的品牌语言无关。
 */

/** 设计系统语义色 + 图标。不用 Tailwind 默认色板。 */
const tone: Record<
  ToastKind,
  { box: string; bar: string; icon: string; Icon: typeof Check }
> = {
  success: {
    box: 'border-success/25 bg-neutral-50 text-ink dark:border-success/30 dark:bg-neutral-800 dark:text-neutral-100',
    bar: 'bg-success',
    icon: 'text-success',
    Icon: Check,
  },
  error: {
    box: 'border-error/30 bg-neutral-50 text-ink dark:border-error/35 dark:bg-neutral-800 dark:text-neutral-100',
    bar: 'bg-error',
    icon: 'text-error',
    Icon: TriangleAlert,
  },
  info: {
    box: 'border-neutral-200 bg-neutral-50 text-ink dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100',
    bar: 'bg-warm-ochre',
    icon: 'text-warm-ochre',
    Icon: Info,
  },
}

/**
 * 单条 toast。
 *
 * 退场时不能直接 unmount —— 那样动画没机会播。做法是保留组件、只把
 * data-state 切到 'out'，动画结束后再由父级移除。
 */
function ToastItem({
  id,
  kind,
  message,
  onDone,
}: {
  id: number
  kind: ToastKind
  message: string
  onDone: (id: number) => void
}) {
  const [state, setState] = useState<'in' | 'out'>('in')
  const closingRef = useRef(false)

  const close = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setState('out')
    // 与 index.css 里 .t-toast-out 的时长对齐；留一点余量避免动画被切断
    window.setTimeout(() => onDone(id), 240)
  }, [id, onDone])

  /**
   * 自动消失也走 close()，而不是让 store 的定时器直接改列表。
   *
   * 之前的写法是 store 里 setTimeout(dismiss)，dismiss 直接把这条从
   * toasts 里 filter 掉 —— 组件被卸载，退场动画一帧都播不出来。
   * 实测采样到的状态序列是 ["in","gone"]，中间那个 out 根本不存在。
   * 计时搬到这里之后，两条路径（手动关闭 / 自动消失）才真的是同一条。
   */
  useEffect(() => {
    const t = window.setTimeout(close, TOAST_DURATION)
    return () => window.clearTimeout(t)
  }, [close])

  // 键盘可达：Escape 关掉最早的一条
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  const t = tone[kind]
  const { Icon } = t

  return (
    <div
      role="status"
      data-state={state}
      className={`t-toast pointer-events-auto relative flex items-start gap-2.5 overflow-hidden rounded-lg border py-3 pl-3.5 pr-3 text-sm shadow-md ${t.box}`}
      // 倒计时线的时长绑定真实的 TOAST_DURATION，而不是在 CSS 里另写一个
      // 3200ms —— 常量改了而 CSS 没改，进度条就和实际消失时间对不上，
      // 那条线就从「信息」退化成「装饰」了。
      style={{ '--toast-duration': `${TOAST_DURATION}ms` } as React.CSSProperties}
    >
      <Icon size={15} className={`mt-0.5 shrink-0 ${t.icon}`} aria-hidden="true" />
      <span className="flex-1 break-words pr-1 leading-relaxed">{message}</span>
      <button
        type="button"
        onClick={close}
        aria-label="关闭提示"
        className="shrink-0 rounded p-0.5 text-neutral-400 transition-colors hover:text-ink dark:hover:text-neutral-100"
      >
        <X size={13} />
      </button>
      {/* 倒计时：告诉用户这条还剩多久，同时也给纯色卡片加一条品牌色线。
          暂停（hover）不是必须的 —— 后台提示都很短，3.2 秒。 */}
      {state === 'in' && (
        <span
          aria-hidden="true"
          className={`t-toast-countdown absolute inset-x-0 bottom-0 h-0.5 ${t.bar}`}
        />
      )}
      {/* 退场时手动 dismiss 也要能收尾（store 里的定时器仍会触发，
          onDone 做幂等） */}
      <span
        aria-hidden="true"
        onAnimationEnd={() => {
          if (state === 'out') onDone(id)
        }}
        className="hidden"
      />
    </div>
  )
}

/**
 * 位置：top-16（64px），正好压在 h-14（56px）顶栏下方留 8px 缝。
 * 原来是 top-4 —— 直接盖在顶栏上，而顶栏右侧正好排着快捷键/主题/账号/
 * 退出四个控件。toast 自己还有个关闭按钮，叠上去等于把别人的按钮盖住
 * 还点不到。
 */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed right-4 top-16 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((item) => (
        <ToastItem
          key={item.id}
          id={item.id}
          kind={item.kind}
          message={item.message}
          onDone={dismiss}
        />
      ))}
    </div>
  )
}

export { TOAST_DURATION }
export default ToastContainer
