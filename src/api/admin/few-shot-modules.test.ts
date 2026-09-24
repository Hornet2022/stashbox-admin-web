import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * 听感运营 api 子模块函数测试 —— CP-NEW.20。
 *
 * vi.mock '../client' 替换 axios instance，验证 7 个子模块（A1-A8）：
 * - few-shot-pool / evaluations / tier-config / ab-report
 * - audio-variants / consents / tts-blind-test
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
  getPoolHealth,
  listPool,
  cleanupPool,
  getAuditSample,
  postAuditResult,
} from './few-shot-pool'
import {
  listEvaluations,
  annotateEvaluation,
  getAgreement,
} from './evaluations'
import { getTierConfig, updateTierConfig } from './tier-config'
import { getAbReport } from './ab-report'
import { getAudioVariantsStats } from './audio-variants'
import { listConsents } from './consents'
import {
  createBlindTest,
  submitBlindTest,
  getBlindTestResults,
} from './tts-blind-test'

const mockedGet = vi.mocked(apiClient.get)
const mockedPost = vi.mocked(apiClient.post)
const mockedPut = vi.mocked(apiClient.put)

beforeEach(() => {
  vi.clearAllMocks()
  mockedGet.mockResolvedValue({ data: { items: [], total: 0 } })
  mockedPost.mockResolvedValue({ data: {} })
  mockedPut.mockResolvedValue({ data: {} })
})

describe('few-shot-pool 模块（A2/A6 · 5 端点）', () => {
  it('getPoolHealth → GET /admin/few-shot-pool/health', async () => {
    mockedGet.mockResolvedValue({ data: { code: 0, data: { health_score: 90 } } })
    const r = await getPoolHealth()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/few-shot-pool/health')
    expect(r.health_score).toBe(90)
  })

  it('listPool → GET /admin/few-shot-pool with filters', async () => {
    await listPool({ kind: 'hook', min_score: 4, active: true, limit: 50, offset: 0 })
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/few-shot-pool', {
      params: { kind: 'hook', min_score: 4, active: true, limit: 50, offset: 0 },
    })
  })

  it('cleanupPool → POST /admin/few-shot-pool/cleanup 带 reason', async () => {
    await cleanupPool('定期清理')
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/admin/few-shot-pool/cleanup', {
      reason: '定期清理',
    })
  })

  it('getAuditSample → GET /admin/few-shot-pool/audit-sample?size', async () => {
    await getAuditSample(10)
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/few-shot-pool/audit-sample', {
      params: { size: 10 },
    })
  })

  it('postAuditResult → POST /admin/few-shot-pool/audit-result', async () => {
    await postAuditResult('ex-1', 8.5)
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/admin/few-shot-pool/audit-result', {
      example_id: 'ex-1',
      audit_score: 8.5,
    })
  })
})

describe('evaluations 模块（A3 · 3 端点）', () => {
  it('listEvaluations → GET /admin/evaluations', async () => {
    await listEvaluations({ auto_flag: false, min_score: 3, limit: 50, offset: 0 })
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/evaluations', {
      params: { auto_flag: false, min_score: 3, limit: 50, offset: 0 },
    })
  })

  it('annotateEvaluation → POST /admin/evaluations/{id}/annotate', async () => {
    mockedPost.mockResolvedValue({ data: { code: 0, data: { id: 'ann-1' } } })
    const r = await annotateEvaluation('ev-1', { overall_score: 4, comment: '校准' })
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/admin/evaluations/ev-1/annotate', {
      overall_score: 4,
      comment: '校准',
    })
    expect(r.id).toBe('ann-1')
  })

  it('getAgreement → GET /admin/evaluations/agreement?task_id', async () => {
    await getAgreement('task-1')
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/evaluations/agreement', {
      params: { task_id: 'task-1' },
    })
  })

  it('getAgreement 无参 → params=undefined', async () => {
    await getAgreement()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/evaluations/agreement', {
      params: undefined,
    })
  })
})

describe('tier-config 模块（A1 · 2 端点）', () => {
  it('getTierConfig → GET /admin/tier-config', async () => {
    mockedGet.mockResolvedValue({ data: { code: 0, data: { source: 'db', warnings: [] } } })
    const r = await getTierConfig()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/tier-config')
    expect(r.source).toBe('db')
  })

  it('updateTierConfig → PUT /admin/tier-config', async () => {
    const payload = { tier_model_map: { simple: { openai: 'gpt-4o-mini' } } }
    mockedPut.mockResolvedValue({ data: { code: 0, data: { source: 'db' } } })
    await updateTierConfig(payload as never)
    expect(mockedPut).toHaveBeenCalledWith('/api/v1/admin/tier-config', payload)
  })
})

describe('ab-report 模块（A4 · 1 端点）', () => {
  it('getAbReport → GET /admin/ab-report with date range', async () => {
    await getAbReport({ date_from: '2026-01-01', date_to: '2026-01-14' })
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/ab-report', {
      params: { date_from: '2026-01-01', date_to: '2026-01-14' },
    })
  })

  it('getAbReport 无参 → 全量', async () => {
    await getAbReport()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/ab-report', { params: {} })
  })
})

describe('audio-variants 模块（A5 · 1 端点）', () => {
  it('getAudioVariantsStats → GET /admin/audio-variants/stats', async () => {
    mockedGet.mockResolvedValue({ data: { code: 0, data: { coverage_ratio: 0.6, by_bitrate: [] } } })
    const r = await getAudioVariantsStats()
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/audio-variants/stats')
    expect(r.coverage_ratio).toBe(0.6)
  })
})

describe('consents 模块（A7 · 1 端点）', () => {
  it('listConsents → GET /admin/consents with filter', async () => {
    await listConsents({ personalization_enabled: true, limit: 50, offset: 0 })
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/consents', {
      params: { personalization_enabled: true, limit: 50, offset: 0 },
    })
  })
})

describe('tts-blind-test 模块（A8 · 3 端点）', () => {
  it('createBlindTest → POST /admin/tts/blind-test', async () => {
    mockedPost.mockResolvedValue({ data: { code: 0, data: { blind_test_id: 'bt-1', samples: [] } } })
    const r = await createBlindTest({ text: '测试文本', providers: ['doubao', 'indextts'] })
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/admin/tts/blind-test', {
      text: '测试文本',
      providers: ['doubao', 'indextts'],
    })
    expect(r.blind_test_id).toBe('bt-1')
  })

  it('submitBlindTest → POST /admin/tts/blind-test/{id}/submit', async () => {
    await submitBlindTest('bt-1', {
      evaluator_id: 'eva-1',
      scores: [{ sample_key: 'sample_1', score: 4 }],
    })
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/admin/tts/blind-test/bt-1/submit', {
      evaluator_id: 'eva-1',
      scores: [{ sample_key: 'sample_1', score: 4 }],
    })
  })

  it('getBlindTestResults → GET /admin/tts/blind-test/{id}/results', async () => {
    mockedGet.mockResolvedValue({
      data: { code: 0, data: { blind_test_id: 'bt-1', evaluator_count: 2, provider_median: {}, revealed_mapping: {} } },
    })
    const r = await getBlindTestResults('bt-1')
    expect(mockedGet).toHaveBeenCalledWith('/api/v1/admin/tts/blind-test/bt-1/results')
    expect(r.evaluator_count).toBe(2)
  })
})