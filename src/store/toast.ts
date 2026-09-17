import { create } from 'zustand'

/**
 * 全局 Toast 状态（Zustand，0 依赖手写，不引第三方 UI 库）。
 *
 * 之所以用 store 而不是 Context，是为了让 **非 React 环境** 也能弹提示 ——
 * axios 响应拦截器（src/api/client.ts）直接调 `toast()` 即可。
 */

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (message: string, kind?: ToastKind) => void
  dismiss: (id: number) => void
  clear: () => void
}

/** 自动消失时长（ms） */
export const TOAST_DURATION = 3200

/** 同时最多显示几条，超出丢弃最旧的 */
const MAX_TOASTS = 4

let seq = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (message, kind = 'info') => {
    const text = message.trim()
    if (!text) return

    // 同文案去重：拦截器可能对并发请求重复弹同一条错误
    const existing = get().toasts.find((t) => t.message === text)
    if (existing) return

    const id = ++seq
    set((state) => {
      const next = [...state.toasts, { id, kind, message: text }]
      return { toasts: next.slice(-MAX_TOASTS) }
    })

    window.setTimeout(() => get().dismiss(id), TOAST_DURATION)
  },

  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}))

/** 在 React 组件外弹 toast（axios 拦截器等） */
export function toast(message: string, kind: ToastKind = 'info') {
  useToastStore.getState().push(message, kind)
}

export default useToastStore
