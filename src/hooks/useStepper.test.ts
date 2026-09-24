import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStepper } from './useStepper'

/**
 * useStepper 状态机边界 —— CP-NEW.11。
 *
 * 覆盖：next/prev clamp / reset 回到 initial / goto 越界 clamp / isFirst/isLast 边界
 */
describe('useStepper', () => {
  it('initial 状态下 active=initial 且 isFirst=true', () => {
    const { result } = renderHook(() => useStepper(0, 3))
    expect(result.current.active).toBe(0)
    expect(result.current.isFirst).toBe(true)
    expect(result.current.isLast).toBe(false)
  })

  it('next 推进 active，超出 total 时 clamp', () => {
    const { result } = renderHook(() => useStepper(0, 3))
    act(() => result.current.next())
    expect(result.current.active).toBe(1)
    act(() => result.current.next())
    expect(result.current.active).toBe(2)
    expect(result.current.isLast).toBe(true)
    // 边界：再 next 不会越界
    act(() => result.current.next())
    expect(result.current.active).toBe(2)
  })

  it('prev 回退 active，下界 clamp 到 0', () => {
    const { result } = renderHook(() => useStepper(2, 4))
    expect(result.current.active).toBe(2)
    act(() => result.current.prev())
    expect(result.current.active).toBe(1)
    act(() => result.current.prev())
    expect(result.current.active).toBe(0)
    expect(result.current.isFirst).toBe(true)
    // 边界：再 prev 不越界
    act(() => result.current.prev())
    expect(result.current.active).toBe(0)
  })

  it('goto 跳到指定步，越界 clamp', () => {
    const { result } = renderHook(() => useStepper(0, 3))
    act(() => result.current.goto(2))
    expect(result.current.active).toBe(2)
    act(() => result.current.goto(-1))
    expect(result.current.active).toBe(0)
    act(() => result.current.goto(99))
    expect(result.current.active).toBe(2)
  })

  it('reset 回到 initial', () => {
    const { result } = renderHook(() => useStepper(1, 4))
    act(() => result.current.goto(3))
    expect(result.current.active).toBe(3)
    act(() => result.current.reset())
    expect(result.current.active).toBe(1)
  })

  it('initial > total-1 时 clamp 到 total-1（健壮性）', () => {
    const { result } = renderHook(() => useStepper(99, 3))
    expect(result.current.active).toBe(2)
  })

  it('total=0 时 isFirst=true 但 isLast=false（边界）', () => {
    // isFirst/isLast 的判定基于 active 与 total-1 的相等性
    // total=0 → total-1 = -1，active 永远不等于 -1，所以 isLast 永远 false
    // 此用例主要验证 next/prev/goto/reset 在 total=0 下不报错
    const { result } = renderHook(() => useStepper(0, 0))
    expect(result.current.isFirst).toBe(true)
    expect(result.current.isLast).toBe(false)
    // 不报错
    act(() => result.current.next())
    act(() => result.current.prev())
    act(() => result.current.goto(0))
    expect(result.current.active).toBe(0)
  })
})