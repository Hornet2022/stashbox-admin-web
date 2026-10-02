import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastContainer } from './Toast'
import { TOAST_DURATION, toast, useToastStore } from '../store/toast'
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

  /**
   * 关闭后不是瞬间消失 —— 组件会先切到 data-state="out" 播完退场动画，
   * 再由 onDone 摘掉。直接卸载等于动画一帧都播不出来（这也是最初没做
   * 进出场动效的原因：没有「播放中」这个中间态）。
   */
  it('点关闭按钮 → 先播退场动画，再卸载', async () => {
    const user = userEvent.setup()
    render(<ToastContainer />)
    act(() => toast('临时提示', 'info'))
    const el = screen.getByText('临时提示')
    expect(el).toBeInTheDocument()
    expect(el.closest('[data-state]')?.getAttribute('data-state')).toBe('in')

    await user.click(screen.getByRole('button', { name: '关闭提示' }))

    // 退场期间仍在 DOM 里（否则动画无从播起）
    expect(screen.getByText('临时提示')).toBeInTheDocument()
    expect(
      screen.getByText('临时提示').closest('[data-state]')?.getAttribute('data-state')
    ).toBe('out')

    await waitFor(
      () => {
        expect(screen.queryByText('临时提示')).toBeNull()
      },
      { timeout: 1500 }
    )
  })

  /**
   * 自动消失也必须先播退场动画。
   * 这条是回归：计时原本在 store 里，dismiss 直接 filter 掉条目，组件当场
   * 卸载，实测采样到的状态序列只有 ["in","gone"]，中间的 out 从未出现。
   */
  it('自动消失：先切 out 再卸载（不是瞬间消失）', async () => {
    render(<ToastContainer />)
    act(() => toast('自动消失的提示', 'info'))
    expect(screen.getByText('自动消失的提示')).toBeInTheDocument()

    // 用真实定时器等它自己走完：TOAST_DURATION 之后应该先出现 out 阶段
    await waitFor(
      () => {
        const el = screen.queryByText('自动消失的提示')
        expect(el?.closest('[data-state]')?.getAttribute('data-state')).toBe('out')
      },
      { timeout: TOAST_DURATION + 2000 }
    )

    await waitFor(
      () => {
        expect(screen.queryByText('自动消失的提示')).toBeNull()
      },
      { timeout: 1500 }
    )
  })

  it('入场即带倒计时进度线，时长绑定真实 TOAST_DURATION', async () => {
    render(<ToastContainer />)
    act(() => toast('带倒计时的提示', 'success'))
    const bar = document.querySelector('.t-toast-countdown')
    expect(bar).toBeTruthy()
    // 进度线时长必须来自 store 的常量，不能在 CSS 里另写一个魔数
    const host = screen.getByText('带倒计时的提示').closest('.t-toast') as HTMLElement
    expect(host.style.getPropertyValue('--toast-duration')).toBe(`${TOAST_DURATION}ms`)
  })

  it('toast 容器 aria-live=polite', () => {
    render(<ToastContainer />)
    act(() => toast('x', 'info'))
    const region = screen.getByText('x').closest('[aria-live]')
    expect(region?.getAttribute('aria-live')).toBe('polite')
  })
})