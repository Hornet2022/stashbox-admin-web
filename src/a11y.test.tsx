import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Tags } from './pages/Tags'
import { Articles } from './pages/Articles'
import { AuditLog } from './pages/AuditLog'
import { useAuthStore } from './store/auth'

/**
 * 跨页面 a11y 检查 —— CP-NEW.18。
 *
 * 验证登录页 + 4 个有代表性的后台页面对 axe-core 自动检测无违规。
 *
 * Mock 策略：
 * - 各 page 用 vi.mock 掉它的 API 模块，渲染稳定的初始态
 * - super_admin 角色以看到全部 UI（与现网一致）
 *
 * 注：axe 在 happy-dom 下可运行，覆盖率约 60% axe-core 规则集，
 * 但能抓到明显 a11y 漏洞：missing alt / empty button / no label / heading order 等。
 */

// vitest-axe/extend-expect 在 setupFile 中注册 toHaveNoViolations

vi.mock('./api/auth', () => ({ login: vi.fn(), logout: vi.fn(), getRole: vi.fn() }))
vi.mock('./api/admin', () => ({
  getStats: vi.fn().mockResolvedValue({}),
  listTags: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  listArticles: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  listAuditLog: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  listUsers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  listPushNotifications: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  adjustQuota: vi.fn(),
  getDistillP95: vi.fn().mockResolvedValue({ cached: false, by_step: {}, overall: { p50: null, p95: null, p99: null } }),
  getLlmConfig: vi.fn().mockResolvedValue({}),
  getTtsConfig: vi.fn().mockResolvedValue({}),
  createArticle: vi.fn(),
  forceRetryArticle: vi.fn(),
  invalidateAudio: vi.fn(),
  deleteAdminArticle: vi.fn(),
  createTag: vi.fn(),
  deleteAdminTag: vi.fn(),
  downloadCsv: vi.fn(),
}))

vi.mock('./hooks/useRole', () => ({
  useRole: () => 'super_admin',
  hasPermission: () => true,
  useCanAnnotate: () => true,
  useCanWrite: () => true,
}))

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: false, role: null, userId: null })
  sessionStorage.clear()
  localStorage.clear()
})

function withRouter(node: React.ReactNode) {
  return <MemoryRouter>{node}</MemoryRouter>
}

describe('a11y —— axe-core 自动检测', () => {
  it('Login 页（未登录态）无 a11y 违规', async () => {
    const { container } = render(withRouter(<Login />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Dashboard 页（5 stats 卡 + 占位）无 a11y 违规', async () => {
    const { container } = render(withRouter(<Dashboard />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Tags 页（空列表）无 a11y 违规', async () => {
    const { container } = render(withRouter(<Tags />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Articles 页（空列表）无 a11y 违规', async () => {
    const { container } = render(withRouter(<Articles />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('AuditLog 页（空列表）无 a11y 违规', async () => {
    const { container } = render(withRouter(<AuditLog />))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})