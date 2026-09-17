import { useToastStore, type ToastKind } from '../store/toast'

/**
 * Toast 渲染容器 —— 挂在 App.tsx 顶层，全局生效。
 *
 * 纯手写（无 sonner / 无第三方 UI 库），样式走 Tailwind。
 */

const toneClass: Record<ToastKind, string> = {
  success:
    'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  info: 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

const iconMap: Record<ToastKind, string> = {
  success: '✓',
  error: '!',
  info: 'i',
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toneClass[item.kind]
          }`}
        >
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px] leading-none">
            {iconMap[item.kind]}
          </span>
          <span className="flex-1 break-words">{item.message}</span>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="关闭提示"
            className="shrink-0 text-current opacity-50 transition-opacity hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
