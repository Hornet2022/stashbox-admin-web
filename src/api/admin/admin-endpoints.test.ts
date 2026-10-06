import { describe, it, expect, beforeEach, vi } from 'vitest'
import { API_BASE_URL, ADMIN_API_PREFIX, getAuthToken } from '../client'

/**
 * api/admin/* 业务端点函数测试 —— CP-NEW.19。
 *
 * 用 vi.mock 替换 client 中的 apiClient，验证每个端点封装：
 * - 路径正确
 * - HTTP method 正确
 * - payload 透传
 * - 返回值类型正确
 */

vi.mock('../client', () => {
  const apiClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
  return {
    default: apiClient,
    apiClient,
    API_BASE_URL: 'http://localhost:8100',
    ADMIN_API_PREFIX: '/api/v1/admin',
    getAuthToken: vi.fn(),
  }
})

import { apiClient } from '../client'
import {
  listUsers,
  adjustQuota,
  listArticles,
  createArticle,
  forceRetryArticle,
  invalidateAudio,
  deleteAdminArticle,
  listTags,
  createTag,
  deleteAdminTag,
  listPushNotifications,
  retryPushNotification,
  listAuditLog,
  getStats,
  getDistillP95,
  getLlmConfig,
  updateLlmConfig,
  testLlm,
  getTtsConfig,
  updateTtsConfig,
  testTts,
  exportCsvUrl,
  downloadCsv,
} from '../admin'

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)
const mockedPut = vi.mocked(apiClient.put)
const mockedDelete = vi.mocked(apiClient.delete)
const mockedGetAuthToken = vi.mocked(getAuthToken)

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetAuthToken.mockReturnValue(null)
  // 默认 resolve 标准信封: { data: <whatever> }
  mockedGet.mockResolvedValue({ data: { items: [], total: 0 } })
  mockedPost.mockResolvedValue({ data: {} })
  mockedPut.mockResolvedValue({ data: {} })
  mockedDelete.mockResolvedValue({ data: {} })
})

describe('users 端点', () => {
  it('listUsers → GET /admin/users with params', async () => {
    await listUsers({ keyword: 'alice', tier: 'pro', page: 2, size: 50 })
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/users', {
      params: { keyword: 'alice', tier: 'pro', page: 2, size: 50 },
    })
  })

  it('adjustQuota → POST /admin/users/{id}/quota-adjust', async () => {
    await adjustQuota(7, 200, 'manual override')
    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/admin/users/7/quota-adjust',
      { monthly_quota: 200, reason: 'manual override' },
    )
  })
})

describe('articles 端点', () => {
  it('listArticles → GET /admin/articles（回归：拆分时曾丢 /admin 段）', async () => {
    // 参数名必须与后端 admin_list_articles 签名一致（limit/offset）。
    // 原用例断言 page/size，把「前端发了后端不认的参数」当成了正确行为固化下来。
    await listArticles({ status: 'failed', tag: 'tech', limit: 50, offset: 0 })
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/articles', {
      params: { status: 'failed', tag: 'tech', limit: 50, offset: 0 },
    })
  })

  it('createArticle → POST /admin/articles（admin 入口：不扣运营配额、不挂运营名下）', async () => {
    await createArticle('https://example.com/a', 'Title A')
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/admin/articles', {
      url: 'https://example.com/a',
      source: 'url',
      title: 'Title A',
    })
  })

  it('forceRetryArticle → POST /admin/articles/{id}/force-retry', async () => {
    await forceRetryArticle(42, 'manual retry')
    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/admin/articles/42/force-retry',
      { reason: 'manual retry' },
    )
  })

  it('invalidateAudio → POST /admin/audio/{id}/invalidate（单数 audio）', async () => {
    await invalidateAudio(99, 'audio broken')
    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/admin/audio/99/invalidate',
      { reason: 'audio broken' },
    )
  })

  it('deleteAdminArticle → DELETE /admin/articles/{id} 带 reason', async () => {
    await deleteAdminArticle(7, 'spam cleanup')
    expect(mockedDelete).toHaveBeenCalledWith('/api/v1/admin/articles/7', {
      data: { reason: 'spam cleanup' },
    })
  })
})

describe('tags 端点', () => {
  it('listTags → GET /admin/tags（不带 query 参数）', async () => {
    // 后端 admin_list_tags 不接受任何 query 参数，发 page/size 会被静默丢弃
    await listTags()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/tags')
  })

  // slug 是后端必填（TagCreateRequest: slug/name/category），之前这个用例断言的
  // body 里既没有 slug 还带了个后端根本不存在的 description 字段 —— 用例是绿的，
  // 真实调用却必然 422。这条断言现在对齐真实契约。
  it('createTag → POST /tags 带 slug（后端必填，缺了必 422）', async () => {
    await createTag('machine-learning', '机器学习')
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/tags', {
      slug: 'machine-learning',
      name: '机器学习',
    })
  })

  it('deleteAdminTag → DELETE /admin/tags/{id} 带 reason', async () => {
    await deleteAdminTag(5, 'cleanup')
    expect(mockedDelete).toHaveBeenCalledWith('/api/v1/admin/tags/5', {
      data: { reason: 'cleanup' },
    })
  })
})

describe('push 端点（v1 需求文档落地版）', () => {
  it('listPushNotifications → GET /admin/push-notifications 标准分页形态', async () => {
    mockedGet.mockResolvedValue({
      data: {
        total: 120,
        limit: 50,
        offset: 50,
        items: [
          { id: 1, user_id: 42, title: 't', body: 'b', status: 'failed', error: 'apns timeout', created_at: '2026-09-24T09:00:00Z', sent_at: null, read_at: null },
        ],
      },
    })
    const r = await listPushNotifications({ status: 'failed', user_id: 42, limit: 50, offset: 50 })
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/push-notifications', {
      params: { status: 'failed', user_id: 42, limit: 50, offset: 50 },
    })
    expect(r.total).toBe(120)
    expect(r.items[0].error).toBe('apns timeout')
  })

  it('retryPushNotification → POST /admin/push-notifications/{id}/retry 带 reason', async () => {
    mockedPost.mockResolvedValue({
      data: { id: 1, user_id: 42, status: 'sent', error: null, sent_at: '2026-09-24T10:00:00Z', retried_at: '2026-09-24T10:00:00Z' },
    })
    const r = await retryPushNotification(1, '通道恢复后重推')
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/admin/push-notifications/1/retry', {
      reason: '通道恢复后重推',
    })
    expect(r.status).toBe('sent')
    expect(r.retried_at).toBeTruthy()
  })
})

describe('audit-log 端点', () => {
  it('listAuditLog → GET /admin/audit-log with filters', async () => {
    await listAuditLog({ page: 1, size: 50, actor_id: 7, action_type: 'delete' })
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/audit-log', {
      params: { page: 1, size: 50, actor_id: 7, action_type: 'delete' },
    })
  })
})

describe('dashboard 端点', () => {
  it('getStats → GET /admin/stats', async () => {
    mockedGet.mockResolvedValue({
      data: { total_users: 100, total_articles: 200, pending: 5, listened: 60, revenue: 0, active_audio_files: 140, failed_distillations_24h: 2 },
    })
    const stats = await getStats()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/stats')
    expect(stats.total_users).toBe(100)
  })

  it('getDistillP95 → GET /admin/distill-p95', async () => {
    mockedGet.mockResolvedValue({
      data: { cached: true, by_step: {}, overall: { p50: 10, p95: 50, p99: 100 } },
    })
    const r = await getDistillP95()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/distill-p95')
    expect(r.cached).toBe(true)
    expect(r.overall.p95).toBe(50)
  })
})

describe('LLM 端点', () => {
  it('getLlmConfig → GET /admin/llm/config', async () => {
    mockedGet.mockResolvedValue({ data: { provider: 'openai', model: 'gpt-4o', api_key_set: true } })
    const cfg = await getLlmConfig()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/llm/config')
    expect(cfg.provider).toBe('openai')
  })

  it('updateLlmConfig → PUT /admin/llm/config', async () => {
    await updateLlmConfig({ provider: 'openai', model: 'gpt-4o-mini' })
    expect(mockedPut).toHaveBeenCalledWith('/api/v1/admin/llm/config', {
      provider: 'openai',
      model: 'gpt-4o-mini',
    })
  })

  it('testLlm → GET /admin/llm/test（回归：拆分时曾误用 POST）', async () => {
    await testLlm()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/llm/test')
  })
})

describe('TTS 端点', () => {
  it('getTtsConfig → GET /admin/tts/config', async () => {
    mockedGet.mockResolvedValue({
      data: { provider: 'indextts', source: 'db', api_key_set: false },
    })
    const cfg = await getTtsConfig()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/tts/config')
    expect(cfg.provider).toBe('indextts')
  })

  it('updateTtsConfig → PUT /admin/tts/config (payload 透传)', async () => {
    const payload = {
      provider: 'openai',
      openai_voice: 'alloy',
      openai_api_key: 'sk-xxx',
    }
    await updateTtsConfig(payload)
    expect(mockedPut).toHaveBeenCalledWith('/api/v1/admin/tts/config', payload)
  })

  it('testTts → GET /admin/tts/test（回归：拆分时曾误用 POST）', async () => {
    await testTts()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/tts/test')
  })
})

describe('CSV 导出', () => {
  it('exportCsvUrl(articles) → 拼完整 URL', () => {
    expect(exportCsvUrl('articles')).toBe(
      `${API_BASE_URL}${ADMIN_API_PREFIX}/export/articles.csv`,
    )
  })

  /**
   * 回归：导出曾经靠 `?token=` 鉴权，但后端只认 Authorization 头。
   * 实测带 ?token= 返 401、带头返 200 —— 也就是说「导出 CSV」在 4 个
   * 页面上从来没成功过。这条用例守住「URL 里不带凭证」：凭证只走请求头。
   */
  it('exportCsvUrl 不带 token query（后端只认 Authorization 头）', () => {
    mockedGetAuthToken.mockReturnValue('jwt-abc')
    const url = exportCsvUrl('users')
    expect(url).not.toContain('?token=')
    expect(url).not.toContain('jwt-abc')
    expect(url).toContain('/export/users.csv')
  })

  it('exportCsvUrl 支持 6 种 ExportKind', () => {
    for (const kind of ['users', 'articles', 'tags', 'audit-log', 'feedback', 'subscriptions'] as const) {
      const url = exportCsvUrl(kind)
      expect(url).toContain(`/export/${kind}.csv`)
    }
  })

  it('downloadCsv → 走 fetch 带 Authorization 头，不做整页跳转', async () => {
    mockedGetAuthToken.mockReturnValue('jwt-abc')
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['id,name\n1,a'], { type: 'text/csv' }),
    })
    vi.stubGlobal('fetch', fetchSpy)
    const createObjectURL = vi.fn().mockReturnValue('blob:fake')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })

    const url = await downloadCsv('feedback')
    expect(url).toBe(`${API_BASE_URL}${ADMIN_API_PREFIX}/export/feedback.csv`)

    // 关键：请求头里必须有 Authorization，且没有 ?token=
    const [calledUrl, init] = fetchSpy.mock.calls[0]
    expect(calledUrl).toBe(url)
    expect(init.headers.Authorization).toBe('Bearer jwt-abc')
    expect(String(calledUrl)).not.toContain('?token=')

    // 不能再动 window.location —— 那会把运营的会话页整个换掉
    expect(createObjectURL).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('downloadCsv 失败时抛错（不能静默，运营会以为导出了空文件）', async () => {
    mockedGetAuthToken.mockReturnValue('jwt-abc')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ code: 40100, message: 'Missing or invalid Authorization header' }),
      })
    )
    await expect(downloadCsv('users')).rejects.toThrow(/Missing or invalid Authorization header/)
    vi.unstubAllGlobals()
  })
})