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
    // 兜底：message 的静态类型是 string，但调用方是 axios 拦截器等非 TS 边界，
    // 传进来的可能是任何值。曾经真的崩过 —— FastAPI 422 的 detail 是**数组**，
    // 数组没有 .trim() → TypeError → React 整页白屏（不是只丢一条提示）。
    // 一个提示组件不该有能力搞崩整个应用，所以这里做最后一次归一化。
    const text = (typeof message === 'string' ? message : String(message ?? '')).trim()
    if (!text) return

    // 同文案去重：拦截器可能对并发请求重复弹同一条错误
    const existing = get().toasts.find((t) => t.message === text)
    if (existing) return

    const id = ++seq
    set((state) => {
      const next = [...state.toasts, { id, kind, message: text }]
      return { toasts: next.slice(-MAX_TOASTS) }
    })

    // 自动消失的计时由 ToastContainer 里的 <ToastItem> 负责 —— 它需要
    // 先播退场动画再卸载。计时留在这里的话，dismiss 会直接把条目从列表
    // 里 filter 掉，组件当场卸载，动画无从播起（实测状态序列只有
    // ["in","gone"]，中间那个 out 不存在）。
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
