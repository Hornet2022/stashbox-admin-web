import { useCallback, useEffect, useRef, useState } from 'react'
import { isEndpointMissing, toErrorMessage } from '../api/client'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** true 表示端点未上线（404 / 网络不可达），页面应显示"功能待上线" */
  missing: boolean
  reload: () => void
}

/**
 * 极简数据获取 hook。
 *
 * `key` 是依赖的字符串指纹（把筛选条件拼进去），变化即重新请求。
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  key = '',
  enabled = true,
): ApiState<T> {
  // Lazy init: derive loading/error/missing from enabled at render time
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [tick, setTick] = useState(0)
  /**
   * 请求是否已落地（成功或失败都算）。
   *
   * 以前 loading 是从 `data === null && error === null` **推导**出来的，
   * 这在 fetcher resolve 出 nullish 值时是个陷阱：setData(null) 让
   * data 仍是 null，于是 loading 永远为 true —— 页面卡在转圈、没有报错，
   * 也没人知道请求其实早就回来了。同理，若接口「成功但返回空」被调用方
   * 当成正常结果，界面就再也停不下来。
   */
  const [settled, setSettled] = useState(false)

  const loading = enabled && !settled

  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    // CP-RELOAD-CLEAR：reload 触发（tick 变化）时清旧 data，避免 Skeleton 期间显示
    // 过时的"当前配置"造成用户疑惑。error 也清，让 loading=true（derived）正常出现。
    setData(null)
    setError(null)
    setMissing(false)
    setSettled(false)

    fetcherRef
      .current()
      .then((res) => {
        if (cancelled) return
        setData(res)
        setSettled(true)
      })
      .catch((err) => {
        if (cancelled) return
        setError(() => toErrorMessage(err))
        setMissing(() => isEndpointMissing(err))
        setSettled(true)
      })

    return () => {
      cancelled = true
    }
  }, [key, enabled, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, error, missing, reload }
}

export default useApi
