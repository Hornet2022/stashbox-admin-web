import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Login } from './Login'
import { useAuthStore } from '../store/auth'
import { useToastStore } from '../store/toast'

/**
 * Login 页单测 —— CP-NEW.14。
 *
 * Mock '../api/auth' 的 named export login()，避免真实 axios 调用。
 * 覆盖：邮箱/密码输入 / 提交 / 错误展示 / submitting skeleton / 已登录跳 dashboard。
 */

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getRole: vi.fn(() => null),
}))

import * as authModule from '../api/auth'
const mockedLogin = vi.mocked(authModule.login)

function renderLogin(initialEntries: string[] = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Login />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: false, role: null, userId: null })
  useToastStore.setState({ toasts: [] })
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('Login', () => {
  it('渲染邮箱 + 密码 + 登录按钮', () => {
    renderLogin()
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })

  it('邮箱 + 密码输入受控', async () => {
    const user = userEvent.setup()
    renderLogin()
    const emailInput = screen.getByLabelText(/邮箱/i) as HTMLInputElement
    const pwInput = screen.getByLabelText(/密码/i) as HTMLInputElement
    await user.type(emailInput, 'admin@example.com')
    await user.type(pwInput, 'pw')
    expect(emailInput.value).toBe('admin@example.com')
    expect(pwInput.value).toBe('pw')
  })

  it('提交时调 login(email, password)', async () => {
    const user = userEvent.setup()
    mockedLogin.mockResolvedValue({ role: 'admin', userId: 42, email: 'admin@example.com' })
    renderLogin()
    await user.type(screen.getByLabelText(/邮箱/i), 'admin@example.com')
    await user.type(screen.getByLabelText(/密码/i), 'password123')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledWith('admin@example.com', 'password123')
    })
  })

  it('登录成功 → 写 setAuth(role, userId) 到 store', async () => {
    const user = userEvent.setup()
    mockedLogin.mockResolvedValue({ role: 'super_admin', userId: 7, email: 'a@b.com' })
    renderLogin()
    await user.type(screen.getByLabelText(/邮箱/i), 'a@b.com')
    await user.type(screen.getByLabelText(/密码/i), 'pw')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      const s = useAuthStore.getState()
      expect(s.role).toBe('super_admin')
      expect(s.userId).toBe(7)
      expect(s.isAuthenticated).toBe(true)
    })
  })

  it('登录失败 → 页面内显示错误文案（后端 message）', async () => {
    const user = userEvent.setup()
    // axios 风格的错误 shape，response.data.message 携带业务错误信息
    mockedLogin.mockRejectedValue({
      response: { status: 401, data: { message: '邮箱或密码错误' } },
    })
    renderLogin()
    await user.type(screen.getByLabelText(/邮箱/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/密码/i), 'wrong')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(screen.getByText('邮箱或密码错误')).toBeInTheDocument()
    })
  })

  it('登录失败错误触发 Toast 提示', async () => {
    const user = userEvent.setup()
    mockedLogin.mockRejectedValue({
      response: { status: 401, data: { message: '网络错误' } },
    })
    renderLogin()
    await user.type(screen.getByLabelText(/邮箱/i), 'a@b.com')
    await user.type(screen.getByLabelText(/密码/i), 'pw')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      const toasts = useToastStore.getState().toasts
      expect(toasts.some((t) => t.message === '网络错误')).toBe(true)
    })
  })

  it('已登录状态 → 重定向到 /dashboard', () => {
    useAuthStore.setState({ isAuthenticated: true, role: 'admin', userId: 1 })
    renderLogin()
    // 登录表单不再渲染
    expect(screen.queryByLabelText(/邮箱/i)).toBeNull()
  })

  it('提交中按钮 disabled', async () => {
    const user = userEvent.setup()
    mockedLogin.mockReturnValue(new Promise(() => {}) as unknown as Promise<never>)
    renderLogin()
    await user.type(screen.getByLabelText(/邮箱/i), 'a@b.com')
    await user.type(screen.getByLabelText(/密码/i), 'pw')
    await user.click(screen.getByRole('button', { name: '登录' }))

    // submitting=true 时按钮 disabled（loading 状态用 skeleton 占位）
    await waitFor(() => {
      const btn = screen.getByRole('button') as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })
  })
})