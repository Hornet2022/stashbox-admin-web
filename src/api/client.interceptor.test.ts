import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiClient } from './client'
import { useToastStore } from '../store/toast'

/**
 * axios 响应拦截器的错误提示行为（2026-10-22 走查补齐）。
 *
 * ## 为什么要锁这条
 *
 * 走查发现 8 处写操作（发起盲测 / 提交评分 / 提交标注 / 重推 /
 * 保存 tier 配置 / 池清理 / 抽查回写）的 catch 里写着注释
 * 「拦截器已 toast」—— 但**那是假的**。
 *
 * 拦截器原来只在「有 HTTP 状态码」时才 toast：
 * 网关不可达 / 跨域失败 / axios 超时这类错误，axios 交给拦截器的
 * error 里**没有 response** → status 是 undefined → 三个分支全不命中
 * → **一个字都不弹**。
 *
 * 用户视角：网关一挂，点「发起盲测」→ 按钮转一圈恢复原状，
 * 界面毫无变化。既不知道成功没成功，也不知道失败了。
 *
 * TtsBlindTest 那一页连 useApi 的兜底都没有 → 这条路径上真的什么都没有。
 *
 * 所以修法是在拦截器里统一补 status === undefined 分支：
 * 一次改，所有写操作都受益，也不会漏。
 */

describe('响应拦截器的错误提示', () => {
  beforeEach(() => {
    useToastStore.getState().clear()
  })

  const toasts = () => useToastStore.getState().toasts

  /** 造一个「没有 response」的网络层错误（网关不可达 / 断网 / CORS 被拦）。 */
  const networkError = () =>
    Object.assign(new Error('Network Error'), {
      code: 'ERR_NETWORK',
      config: {},
    })

  it('网络层失败（无 response）→ 必须弹提示，不能静默', async () => {
    // 拦掉真实请求，直接把错误交给响应拦截器
    const adapter = vi.fn(async () => {
      throw networkError()
    })

    await expect(
      apiClient.get('/api/v1/admin/stats', { adapter: adapter as never }),
    ).rejects.toBeTruthy()

    expect(toasts()).toHaveLength(1)
    expect(toasts()[0].kind).toBe('error')
    expect(toasts()[0].message).toMatch(/无法连接 api-gateway/)
  })

  it('业务 4xx → 弹提示（回归护栏）', async () => {
    const adapter = vi.fn(async () => {
      const err = Object.assign(new Error('Request failed with status code 400'), {
        response: { status: 400, data: { message: '参数不合法' } },
        config: {},
      })
      throw err
    })

    await expect(
      apiClient.get('/api/v1/admin/stats', { adapter: adapter as never }),
    ).rejects.toBeTruthy()

    expect(toasts()).toHaveLength(1)
    expect(toasts()[0].message).toMatch(/参数不合法/)
  })

  it('请求超时（ECONNABORTED）→ 弹提示', async () => {
    const adapter = vi.fn(async () => {
      const err = Object.assign(new Error('timeout of 15000ms exceeded'), {
        code: 'ECONNABORTED',
        config: { timeout: 15000 },
      })
      throw err
    })

    await expect(
      apiClient.get('/api/v1/admin/stats', { adapter: adapter as never }),
    ).rejects.toBeTruthy()

    expect(toasts()).toHaveLength(1)
    expect(toasts()[0].message).toMatch(/请求超时/)
  })
})
