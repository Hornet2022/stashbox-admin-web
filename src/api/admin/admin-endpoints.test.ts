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
  it('listArticles → GET /articles', async () => {
    await listArticles({ status: 'failed', tag: 'tech', page: 1, size: 50 })
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/articles', {
      params: { status: 'failed', tag: 'tech', page: 1, size: 50 },
    })
  })

  it('createArticle → POST /articles', async () => {
    await createArticle('https://example.com/a', 'url', 'Title A')
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/articles', {
      url: 'https://example.com/a',
      source: 'url',
      title: 'Title A',
    })
  })

  it('forceRetryArticle → POST /articles/{id}/force-retry', async () => {
    await forceRetryArticle(42, 'manual retry')
    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/articles/42/force-retry',
      { reason: 'manual retry' },
    )
  })

  it('invalidateAudio → POST /audios/{id}/invalidate', async () => {
    await invalidateAudio(99, 'audio broken')
    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/audios/99/invalidate',
      { reason: 'audio broken' },
    )
  })

  it('deleteAdminArticle → DELETE /articles/{id} 带 reason', async () => {
    await deleteAdminArticle(7, 'spam cleanup')
    expect(mockedDelete).toHaveBeenCalledWith('/api/v1/articles/7', {
      data: { reason: 'spam cleanup' },
    })
  })
})

describe('tags 端点', () => {
  it('listTags → GET /admin/tags', async () => {
    await listTags({ page: 1, size: 50 })
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/tags', {
      params: { page: 1, size: 50 },
    })
  })

  it('createTag → POST /admin/tags', async () => {
    await createTag('machine-learning', 'AI/ML 相关')
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/admin/tags', {
      name: 'machine-learning',
      description: 'AI/ML 相关',
    })
  })

  it('deleteAdminTag → DELETE /admin/tags/{id} 带 reason', async () => {
    await deleteAdminTag(5, 'cleanup')
    expect(mockedDelete).toHaveBeenCalledWith('/api/v1/admin/tags/5', {
      data: { reason: 'cleanup' },
    })
  })
})

describe('push 端点', () => {
  it('listPushNotifications → GET /api/v1/notifications（回归：拆分时曾误写 admin 路径）', async () => {
    mockedGet.mockResolvedValue({
      data: { notifications: [{ id: 1, title: 't', body: 'b', read: false, created_at: '2024-01-01T00:00:00Z' }], unread_count: 1 },
    })
    const r = await listPushNotifications({ page: 1, size: 50, status: 'sent' })
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/notifications', {
      params: { page: 1, size: 50, status: 'sent' },
    })
    // {notifications} 形态归一化
    expect(r.items).toHaveLength(1)
    expect(r.total).toBe(1)
  })

  it('listPushNotifications 空响应 → items=[] total=0', async () => {
    mockedGet.mockResolvedValue({ data: { notifications: [], unread_count: 0 } })
    const r = await listPushNotifications()
    expect(r.items).toEqual([])
    expect(r.total).toBe(0)
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

  it('testLlm → POST /admin/llm/test', async () => {
    await testLlm()
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/admin/llm/test')
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

  it('testTts → POST /admin/tts/test', async () => {
    await testTts()
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/admin/tts/test')
  })
})

describe('CSV 导出', () => {
  it('exportCsvUrl(articles) → 拼完整 URL', () => {
    expect(exportCsvUrl('articles')).toBe(
      `${API_BASE_URL}${ADMIN_API_PREFIX}/export/articles.csv`,
    )
  })

  it('exportCsvUrl 带 token query 参数', () => {
    mockedGetAuthToken.mockReturnValue('jwt-abc')
    expect(exportCsvUrl('users')).toContain('?token=jwt-abc')
    expect(exportCsvUrl('users')).toContain('/export/users.csv')
  })

  it('exportCsvUrl 支持 6 种 ExportKind', () => {
    for (const kind of ['users', 'articles', 'tags', 'audit-log', 'feedback', 'subscriptions'] as const) {
      const url = exportCsvUrl(kind)
      expect(url).toContain(`/export/${kind}.csv`)
    }
  })

  it('downloadCsv → 返回 URL 含 kind + 拼 token', () => {
    // downloadCsv 内部会触发 window.location.href 跳转（happy-dom 下报错），
    // 这里改测它"返回 URL"的契约，行为由 e2e 覆盖
    const url = downloadCsv('feedback')
    expect(url).toContain('/export/feedback.csv')
    expect(url).toBe(`${API_BASE_URL}${ADMIN_API_PREFIX}/export/feedback.csv`)
  })
})