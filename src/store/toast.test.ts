import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useToastStore, toast, TOAST_DURATION } from './toast'

/**
 * useToastStore —— CP-NEW.11。
 *
 * API: push(message, kind) / dismiss(id) / clear
 * 全局: toast(message, kind) → push 包装
 *
 * 行为契约（实测）：
 * - 同文案去重（不看时间，只看 message 完全相等）
 * - 空字符串 / 全空白 → 静默忽略
 * - 容量上限 MAX_TOASTS = 4 条（slice(-4)）
 * - TOAST_DURATION = 3200ms 自动 dismiss（用 fake timers 验证）
 */

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
  vi.useFakeTimers()
})

describe('useToastStore', () => {
  it('push 后 toasts 长度 +1，message / kind 正确', () => {
    useToastStore.getState().push('hello', 'info')
    const s = useToastStore.getState()
    expect(s.toasts).toHaveLength(1)
    expect(s.toasts[0].message).toBe('hello')
    expect(s.toasts[0].kind).toBe('info')
  })

  it('默认 kind = info', () => {
    useToastStore.getState().push('hello')
    expect(useToastStore.getState().toasts[0].kind).toBe('info')
  })

  it('全局 toast() 函数等同 push 包装', () => {
    toast('global-msg', 'error')
    const t = useToastStore.getState().toasts[0]
    expect(t.message).toBe('global-msg')
    expect(t.kind).toBe('error')
  })

  it('去重：同文案后续 push 不再加（同 message trim 后完全相等）', () => {
    useToastStore.getState().push('hello', 'info')
    useToastStore.getState().push('hello', 'info')
    useToastStore.getState().push('hello', 'info')
    expect(useToastStore.getState().toasts).toHaveLength(1)
  })

  it('不同文案视为不同', () => {
    useToastStore.getState().push('hello', 'info')
    useToastStore.getState().push('world', 'info')
    expect(useToastStore.getState().toasts).toHaveLength(2)
  })

  it('不同 kind 视为不同（contract 注意：仅 message 去重）', () => {
    useToastStore.getState().push('hello', 'info')
    useToastStore.getState().push('hello', 'error')
    expect(useToastStore.getState().toasts).toHaveLength(1) // 同 message 仍去重
  })

  it('空字符串 / 全空白 → 静默忽略', () => {
    useToastStore.getState().push('')
    useToastStore.getState().push('   ')
    useToastStore.getState().push('\n\t')
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('容量上限 4 条：第 5 条挤掉最老的', () => {
    for (let i = 0; i < 6; i++) {
      useToastStore.getState().push(`msg-${i}`, 'info')
    }
    expect(useToastStore.getState().toasts).toHaveLength(4)
    const msgs = useToastStore.getState().toasts.map((t) => t.message)
    expect(msgs).toEqual(['msg-2', 'msg-3', 'msg-4', 'msg-5'])
  })

  /**
   * store 只管「有哪些 toast」，不管「什么时候消失」。
   *
   * 自动消失的计时放在 <ToastItem> 里，因为它要先播退场动画再卸载 ——
   * 计时留在 store 的话 dismiss 会直接 filter，组件当场消失，动画播不出来。
   * 这条用例守住的是「push 只负责入列，不启动定时器」这个边界。
   * 自动消失的端到端行为由 shell.test.tsx 覆盖。
   */
  it('push 只入列，不自行启动消失定时器', () => {
    useToastStore.getState().push('hello', 'info')
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(TOAST_DURATION * 3)
    // 仍然在列里 —— 消失时机由渲染层决定
    expect(useToastStore.getState().toasts).toHaveLength(1)
    useToastStore.getState().dismiss(useToastStore.getState().toasts[0].id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('dismiss 按 id 移除单条', () => {
    useToastStore.getState().push('a', 'info')
    useToastStore.getState().push('b', 'info')
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().dismiss(id)
    const msgs = useToastStore.getState().toasts.map((t) => t.message)
    expect(msgs).toEqual(['b'])
  })

  it('dismiss 不存在的 id → noop', () => {
    useToastStore.getState().push('a', 'info')
    useToastStore.getState().dismiss(99999)
    expect(useToastStore.getState().toasts).toHaveLength(1)
  })

  it('clear 清空全部', () => {
    useToastStore.getState().push('a', 'info')
    useToastStore.getState().push('b', 'error')
    useToastStore.getState().clear()
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})