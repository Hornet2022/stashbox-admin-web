import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * api/auth.ts login 测试 —— CP-NEW.20d。
 *
 * 覆盖：token 提取（token/access_token）/ role/user_id 双形态兼容
 *       (payload.role vs payload.user.role) / sessionStorage 写入。
 */

vi.mock('./client', () => {
  const apiClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
  return {
    default: apiClient,
    apiClient,
    getAuthToken: vi.fn(),
    setAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
  }
})

import apiClient, { setAuthToken } from './client'
import { login, getRole } from './auth'

const mockedPost = vi.mocked(apiClient.post)
const mockedSetAuthToken = vi.mocked(setAuthToken)

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe('login', () => {
  it('标准响应：token + role + user_id', async () => {
    mockedPost.mockResolvedValue({
      data: { code: 0, data: { token: 'jwt-1', role: 'super_admin', user_id: 7 } },
    })
    const r = await login('a@b.com', 'pw')
    expect(mockedPost).toHaveBeenCalledWith('/api/v1/admin/auth/login', {
      email: 'a@b.com',
      password: 'pw',
    })
    expect(r).toEqual({ role: 'super_admin', userId: 7, email: undefined })
    expect(mockedSetAuthToken).toHaveBeenCalledWith('jwt-1')
  })

  it('access_token 变体也能提取', async () => {
    mockedPost.mockResolvedValue({
      data: { code: 0, data: { access_token: 'jwt-2' } },
    })
    await login('a@b.com', 'pw')
    expect(mockedSetAuthToken).toHaveBeenCalledWith('jwt-2')
  })

  it('嵌套 user 对象：role/user.id/email 兜底', async () => {
    mockedPost.mockResolvedValue({
      data: { code: 0, data: { user: { id: 3, email: 'u@x.com', role: 'operator' } } },
    })
    const r = await login('a@b.com', 'pw')
    expect(r).toEqual({ role: 'operator', userId: 3, email: 'u@x.com' })
  })

  it('裸响应（无 code/message 包装）也能解析', async () => {
    mockedPost.mockResolvedValue({
      data: { role: 'admin', user_id: 1 },
    })
    const r = await login('a@b.com', 'pw')
    expect(r.role).toBe('admin')
    expect(r.userId).toBe(1)
  })

  it('无 token → 不调 setAuthToken', async () => {
    mockedPost.mockResolvedValue({ data: { code: 0, data: { role: 'viewer' } } })
    const r = await login('a@b.com', 'pw')
    expect(mockedSetAuthToken).not.toHaveBeenCalled()
    // 兜底 role 默认值检查（无 token 无 user 时仍写 sessionStorage）
    expect(sessionStorage.getItem('admin_role')).toBe(r.role)
  })

  it('role 缺省 → 兜底 "admin"', async () => {
    mockedPost.mockResolvedValue({ data: { code: 0, data: { token: 'x' } } })
    const r = await login('a@b.com', 'pw')
    expect(r.role).toBe('admin')
    expect(r.userId).toBe(0)
  })

  it('getRole 读 sessionStorage', async () => {
    sessionStorage.setItem('admin_role', 'operator')
    expect(getRole()).toBe('operator')
    sessionStorage.removeItem('admin_role')
    expect(getRole()).toBeNull()
  })
})