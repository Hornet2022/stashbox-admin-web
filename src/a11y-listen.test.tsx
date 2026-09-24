import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { useAuthStore } from './store/auth'

/**
 * 听感运营 7 页 a11y 检查 —— CP-NEW.20c。
 *
 * mock 各 api 子模块返回稳定的示例数据，axe-core 检测无违规。
 */

vi.mock('./api/admin/few-shot-pool', () => ({
  getPoolHealth: vi.fn().mockResolvedValue({
    total_count: 10,
    high_score_count: 5,
    medium_score_count: 3,
    low_score_count: 2,
    active_count: 8,
    stale_count: 1,
    health_score: 80,
    warning: null,
  }),
  listPool: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  cleanupPool: vi.fn(),
  getAuditSample: vi.fn().mockResolvedValue({ total: 0, items: [] }),
  postAuditResult: vi.fn(),
}))

vi.mock('./api/admin/evaluations', () => ({
  listEvaluations: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getAgreement: vi.fn().mockResolvedValue({ agreement: 0.9, evaluator_count: 2, annotated_count: 5, task_filter: null }),
  annotateEvaluation: vi.fn(),
}))

vi.mock('./api/admin/tier-config', () => ({
  getTierConfig: vi.fn().mockResolvedValue({
    tier_model_map: { simple: { openai: 'm1' }, full: { openai: 'm2' } },
    source: 'db',
    default_map: { simple: { openai: 'd1' }, full: { openai: 'd2' } },
    supported_providers: ['openai'],
    warnings: [],
    updated_at: null,
  }),
  updateTierConfig: vi.fn(),
}))

vi.mock('./api/admin/ab-report', () => ({
  getAbReport: vi.fn().mockResolvedValue({ groups: [], caveats: [] }),
}))

vi.mock('./api/admin/audio-variants', () => ({
  getAudioVariantsStats: vi.fn().mockResolvedValue({
    by_bitrate: [{ bitrate: 64, count: 3, avg_file_size_bytes: 1000, avg_duration_sec: 30 }],
    covered_articles: 3,
    done_articles: 10,
    coverage_ratio: 0.3,
  }),
}))

vi.mock('./api/admin/consents', () => ({
  listConsents: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}))

vi.mock('./api/admin/tts-blind-test', () => ({
  createBlindTest: vi.fn(),
  submitBlindTest: vi.fn(),
  getBlindTestResults: vi.fn(),
}))

vi.mock('./hooks/useRole', () => ({
  useRole: () => 'super_admin',
  hasPermission: () => true,
  useCanAnnotate: () => true,
  useCanWrite: () => true,
}))

import { FewShotPool } from './pages/FewShotPool'
import { Evaluations } from './pages/Evaluations'
import { ModelRouting } from './pages/ModelRouting'
import { AbReport } from './pages/AbReport'
import { AudioVariants } from './pages/AudioVariants'
import { Consents } from './pages/Consents'
import { TtsBlindTest } from './pages/TtsBlindTest'

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: true, role: 'super_admin', userId: 1 })
  sessionStorage.clear()
})

function withRouter(node: React.ReactNode) {
  return <MemoryRouter>{node}</MemoryRouter>
}

describe('a11y —— 听感运营 7 页', () => {
  it('FewShotPool（健康度+列表 tab）无 a11y 违规', async () => {
    const { container } = render(withRouter(<FewShotPool />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Evaluations 无 a11y 违规', async () => {
    const { container } = render(withRouter(<Evaluations />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('ModelRouting 无 a11y 违规', async () => {
    const { container } = render(withRouter(<ModelRouting />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('TtsBlindTest（步骤 1 表单）无 a11y 违规', async () => {
    const { container } = render(withRouter(<TtsBlindTest />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('AbReport（caveats + 数据不足态）无 a11y 违规', async () => {
    const { container } = render(withRouter(<AbReport />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('AudioVariants 无 a11y 违规', async () => {
    const { container } = render(withRouter(<AudioVariants />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Consents 无 a11y 违规', async () => {
    const { container } = render(withRouter(<Consents />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})