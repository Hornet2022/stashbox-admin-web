import { useCallback, useState } from 'react'

/**
 * 多步工作流状态机 —— CP-NEW.1。
 *
 * 用于盲测（A8）、池抽查（A6）等 3 步工作流，避免每个页面重复写状态管理。
 *
 * - active：当前步骤索引（0-based）
 * - next/prev：前进/后退，自动 clamp 在 [0, total-1]
 * - goto(i)：跳到指定步（常用于「上一步」回填后跳回下一步）
 * - reset()：回到 initial
 * - isFirst/isLast：边界态，用于禁用按钮
 */
export function useStepper(initial: number, total: number) {
  const [active, setActive] = useState(() =>
    Math.max(0, Math.min(initial, Math.max(total - 1, 0))),
  )

  const next = useCallback(() => {
    setActive((a) => Math.min(a + 1, total - 1))
  }, [total])

  const prev = useCallback(() => {
    setActive((a) => Math.max(a - 1, 0))
  }, [])

  const goto = useCallback(
    (i: number) => {
      setActive(Math.max(0, Math.min(i, total - 1)))
    },
    [total],
  )

  const reset = useCallback(() => {
    setActive(Math.max(0, Math.min(initial, Math.max(total - 1, 0))))
  }, [initial, total])

  return {
    active,
    next,
    prev,
    goto,
    reset,
    isFirst: active === 0,
    isLast: active === total - 1,
  }
}

export default useStepper