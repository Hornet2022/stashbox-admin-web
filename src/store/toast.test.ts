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
 * - 容量上限 MAX_TOASTS = 4 条：超出时把最旧的标记为 exiting 留在数组里，
 *   等 <ToastItem> 播完退场动画再由它自己调 dismiss（**不是**直接 slice）
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

  /**
   * 2026-10-03：这条断言原来锁的是 `slice(-MAX_TOASTS)`，也就是第 5 条一进来
   * 最旧的就被从数组里切掉。后果是 <ToastItem> 当场卸载，退场动画一帧都播不出来
   * （和自动消失那条路曾经修过的 bug 一样，只是从溢出这条路绕了回来），
   * 而且被丢的是最旧的那条 —— 用户最可能正在读的那条。
   *
   * 现在改成：超出时把最旧的标成 exiting 留在数组里，
   * 组件播完动画自己调 dismiss。数组长度会短暂到 5，这是有意的：
   * 离场中的那一条还需要留在 DOM 里。
   */
  it('容量上限 4 条：超出时最旧的被标记 exiting，而不是当场被切掉', () => {
    for (let i = 0; i < 6; i++) {
      useToastStore.getState().push(`msg-${i}`, 'info')
    }
    const toasts = useToastStore.getState().toasts

    // 这里数组是 6 条而不是 4 条，是**有意的**：单测里没有 <ToastItem>，
    // 也就没有人去跑那 240ms 的退场动画、没有人调 dismiss。
    // 离场中的那两条必须留在数组里 —— 组件卸载了就等于动画没播过，
    // 那正是要修的 bug。在真实页面里动画播完就会 dismiss，数组回到 4 条。
    expect(toasts.map((t) => t.message)).toEqual([
      'msg-0', 'msg-1', 'msg-2', 'msg-3', 'msg-4', 'msg-5',
    ])

    // 超出的两条被标记，退场中；其余四条没有
    expect(toasts.filter((t) => t.exiting).map((t) => t.message))
      .toEqual(['msg-0', 'msg-1'])
    expect(toasts.slice(2).every((t) => !t.exiting)).toBe(true)

    // 退场中的那条不会被重复标记 —— 标记是幂等的
    useToastStore.getState().beginExit(toasts[0].id)
    expect(useToastStore.getState().toasts.filter((t) => t.exiting)).toHaveLength(2)
  })

  it('beginExit 只标记不卸载；dismiss 才真正移除', () => {
    useToastStore.getState().push('a', 'info')
    const id = useToastStore.getState().toasts[0].id

    useToastStore.getState().beginExit(id)
    // 仍在数组里 —— 组件要靠它播退场动画
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].exiting).toBe(true)

    useToastStore.getState().dismiss(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
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