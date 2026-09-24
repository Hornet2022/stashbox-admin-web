import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastContainer } from './Toast'
import { toast, useToastStore } from '../store/toast'
import { useAuthStore } from '../store/auth'

/**
 * AuthGuard / ErrorBoundary / ToastContainer 组件测试 —— CP-NEW.20。
 */

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: false, role: null, userId: null })
  useToastStore.setState({ toasts: [] })
  sessionStorage.clear()
  localStorage.clear()
})

describe('AuthGuard', () => {
  it('未登录 → 重定向到 /login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <div>secret</div>
              </AuthGuard>
            }
          />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('secret')).toBeNull()
  })

  it('已登录 → 渲染 children', () => {
    useAuthStore.setState({ isAuthenticated: true, role: 'admin', userId: 1 })
    render(
      <MemoryRouter>
        <AuthGuard>
          <div>secret</div>
        </AuthGuard>
      </MemoryRouter>,
    )
    expect(screen.getByText('secret')).toBeInTheDocument()
  })

  it('重定向携带 location state.from', () => {
    useAuthStore.setState({ isAuthenticated: false })
    function Probe() {
      const loc = useLocation() as { state?: { from?: string } }
      return <div>{loc.state?.from ?? 'none'}</div>
    }
    render(
      <MemoryRouter initialEntries={['/evaluations']}>
        <Routes>
          <Route
            path="/evaluations"
            element={
              <AuthGuard>
                <div>secret</div>
              </AuthGuard>
            }
          />
          <Route path="/login" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('/evaluations')).toBeInTheDocument()
  })
})

describe('ErrorBoundary', () => {
  it('children 正常 → 直接渲染', () => {
    render(
      <ErrorBoundary>
        <div>fine</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('fine')).toBeInTheDocument()
    expect(screen.queryByText('出错了')).toBeNull()
  })

  it('children 抛错 → 渲染 fallback（出错了 + 错误信息）', () => {
    const Boom = () => {
      throw new Error('boom-message')
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText('出错了')).toBeInTheDocument()
    expect(screen.getByText(/boom-message/)).toBeInTheDocument()
    spy.mockRestore()
  })

  it('点"重试" → 清错误重新渲染 children', async () => {
    // 受控抛错：shouldThrow 由测试翻转，避免依赖 React 渲染次数
    let shouldThrow = true
    const Flaky = () => {
      if (shouldThrow) throw new Error('first fail')
      return <div>recovered</div>
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    )
    expect(screen.getByText('出错了')).toBeInTheDocument()
    shouldThrow = false
    await user.click(screen.getByRole('button', { name: '重试' }))
    await waitFor(() => {
      expect(screen.getByText('recovered')).toBeInTheDocument()
    })
    spy.mockRestore()
  })

  it('fallback 有"重置并返回总览"按钮', () => {
    const Boom = () => {
      throw new Error('boom')
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('button', { name: '重置并返回总览' })).toBeInTheDocument()
    spy.mockRestore()
  })
})

describe('ToastContainer', () => {
  it('无 toast → 渲染 null', () => {
    const { container } = render(<ToastContainer />)
    expect(container.firstChild).toBeNull()
  })

  it('toast("消息", "success") → 渲染消息 + role=status', () => {
    render(<ToastContainer />)
    act(() => toast('操作成功', 'success'))
    expect(screen.getByText('操作成功')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('多条 toast 按序渲染', () => {
    render(<ToastContainer />)
    act(() => {
      toast('第一条', 'info')
      toast('第二条', 'error')
    })
    expect(screen.getByText('第一条')).toBeInTheDocument()
    expect(screen.getByText('第二条')).toBeInTheDocument()
  })

  it('点关闭按钮 → toast 消失', async () => {
    const user = userEvent.setup()
    render(<ToastContainer />)
    act(() => toast('临时提示', 'info'))
    expect(screen.getByText('临时提示')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '关闭提示' }))
    expect(screen.queryByText('临时提示')).toBeNull()
  })

  it('toast 容器 aria-live=polite', () => {
    render(<ToastContainer />)
    act(() => toast('x', 'info'))
    const region = screen.getByText('x').closest('[aria-live]')
    expect(region?.getAttribute('aria-live')).toBe('polite')
  })
})