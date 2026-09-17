import { useCallback, useEffect, useRef, useState } from 'react'
import { isEndpointMissing, toErrorMessage } from '../api/client'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** true 表示端点未上线（404 / 网络不可达），页面应显示“功能待上线” */
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
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [tick, setTick] = useState(0)

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setMissing(false)

    fetcherRef
      .current()
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (cancelled) return
        setData(null)
        setError(toErrorMessage(err))
        setMissing(isEndpointMissing(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [key, enabled, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, error, missing, reload }
}

export default useApi
