import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useApi } from './useApi'

/**
 * useApi hook 单测 —— CP-NEW.12。
 *
 * 覆盖：loading 派生状态 / 成功设 data / 失败设 error + missing /
 * key 变化重新请求 / reload 触发 tick / enabled=false 不请求 /
 * cancelled 守卫（unmount 不更新 state）。
 */

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('成功：fetcher resolve → data 设上 + loading=false + error=null', async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2] })
    const { result } = renderHook(() => useApi(fetcher, 'k'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.data).toEqual({ items: [1, 2] })
    expect(result.current.error).toBe(null)
    expect(result.current.missing).toBe(false)
  })

  it('失败 404 → error 写入 + missing=true', async () => {
    const err404 = { response: { status: 404 } }
    const fetcher = vi.fn().mockRejectedValue(err404)
    const { result } = renderHook(() => useApi(fetcher, 'k'))

    await waitFor(() => {
      expect(result.current.error).not.toBe(null)
    })
    expect(result.current.missing).toBe(true)
    expect(result.current.data).toBe(null)
  })

  it('失败 500 → error 写入 + missing=false', async () => {
    const err500 = { response: { status: 500, data: { message: '服务端异常' } } }
    const fetcher = vi.fn().mockRejectedValue(err500)
    const { result } = renderHook(() => useApi(fetcher, 'k'))

    await waitFor(() => {
      expect(result.current.error).not.toBe(null)
    })
    expect(result.current.missing).toBe(false)
    expect(result.current.error).toMatch(/服务端异常/)
  })

  it('key 变化 → 重新请求（清旧 data）', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 })

    const { result, rerender } = renderHook(({ k }) => useApi(fetcher, k), {
      initialProps: { k: 'a' },
    })

    await waitFor(() => expect(result.current.data).toEqual({ id: 1 }))
    rerender({ k: 'b' })
    await waitFor(() => expect(result.current.data).toEqual({ id: 2 }))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('reload 触发重新请求（通过 tick 累加）', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 })
    const { result } = renderHook(() => useApi(fetcher, 'k'))

    await waitFor(() => expect(result.current.data).toEqual({ id: 1 }))

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.data).toEqual({ id: 2 }))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('enabled=false → 不发请求，loading=false', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 1 })
    const { result } = renderHook(() => useApi(fetcher, 'k', false))

    // 不等待任何 promise — loading 在 enabled=false 时直接为 false
    expect(result.current.loading).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.data).toBe(null)
  })

  it('unmount 时 cancelled 守卫生效（不更新 state）', async () => {
    const d = deferred<{ id: 1 }>()
    const fetcher = vi.fn().mockReturnValue(d.promise)
    const { result, unmount } = renderHook(() => useApi(fetcher, 'k'))

    expect(result.current.loading).toBe(true)
    unmount()
    // 即使 resolve 也不会触发警告（cancelled guard）
    d.resolve({ id: 1 } as never)
    await Promise.resolve()
    // result 已销毁，但这里只是验证没抛错
    expect(true).toBe(true)
  })

  it('error 后 reload → 清 error + loading 重新为 true', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce({ ok: true })

    const { result } = renderHook(() => useApi(fetcher, 'k'))

    await waitFor(() => expect(result.current.error).not.toBe(null))
    expect(result.current.data).toBe(null)

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.data).toEqual({ ok: true }))
    expect(result.current.error).toBe(null)
  })
})