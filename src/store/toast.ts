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
  /**
   * 已决定退场，但条目**仍留在数组里**，等 <ToastItem> 播完动画自己调 dismiss。
   *
   * 之前超出 4 条时是 `next.slice(-MAX_TOASTS)` 直接把最旧的从数组里切掉：
   * 组件当场卸载，退场动画一帧都播不出来（就是本文件下面注释里记的
   * 「实测状态序列只有 ["in","gone"]」那个 bug，只是它从自动消失那条路
   * 绕到了溢出这条路）。而且 slice 丢的是**最旧**的那条 —— 恰好是用户
   * 最可能正在读的那条。
   */
  exiting?: boolean
}

interface ToastState {
  toasts: ToastItem[]
  push: (message: string, kind?: ToastKind) => void
  dismiss: (id: number) => void
  /** 标记为退场中：条目留在数组里，由 <ToastItem> 播完动画后自行 dismiss */
  beginExit: (id: number) => void
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
      // 超出上限时不再 slice —— 那样等于当场卸载，最旧的提示无声消失。
      // 改成把它标成退场中，交给组件播完动画再移除。
      //
      // 上限只按**还活着**的条目算（exiting 的不占位），否则会误判：
      // 一条正在退场时又来一条新提示，如果把 exiting 也算进基数，
      // 就会多标一条，连环推送下数组会在那 240ms 里一路涨上去。
      // live 就是此刻还该占位的条数，超过的部分标退场。
      const live = next.filter((t) => !t.exiting).length
      const overflow = live - MAX_TOASTS
      if (overflow <= 0) return { toasts: next }
      let marked = 0
      return {
        toasts: next.map((t) => {
          if (t.exiting || marked >= overflow) return t
          marked += 1
          return { ...t, exiting: true }
        }),
      }
    })

    // 自动消失的计时由 ToastContainer 里的 <ToastItem> 负责 —— 它需要
    // 先播退场动画再卸载。计时留在这里的话，dismiss 会直接把条目从列表
    // 里 filter 掉，组件当场卸载，动画无从播起（实测状态序列只有
    // ["in","gone"]，中间那个 out 不存在）。
  },

  beginExit: (id) =>
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    })),

  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}))

/** 在 React 组件外弹 toast（axios 拦截器等） */
export function toast(message: string, kind: ToastKind = 'info') {
  useToastStore.getState().push(message, kind)
}

export default useToastStore
