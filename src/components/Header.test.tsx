import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Header } from './Header'
import { useAuthStore } from '../store/auth'
import { useThemeStore } from '../store/theme'
import { useShortcutsHelp } from '../hooks/useShortcuts'

/**
 * Header 组件测试 —— CP-NEW.20d。
 *
 * 覆盖：角色显示 / 主题切换 / 快捷键按钮 / 退出登录 / 移动端菜单回调。
 */

// logout() 会写 window.location.href，mock 掉
vi.mock('../api/auth', () => ({
  logout: vi.fn(),
}))

import { logout } from '../api/auth'
const mockedLogout = vi.mocked(logout)

function renderHeader(props: { onMenuToggle?: () => void } = {}) {
  return render(
    <MemoryRouter>
      <Header {...props} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: true, role: 'operator', userId: 5 })
  useThemeStore.setState({ theme: 'light' })
  useShortcutsHelp.setState({ helpOpen: false })
  vi.clearAllMocks()
})

describe('Header', () => {
  it('显示当前角色', () => {
    renderHeader()
    expect(screen.getByText('operator')).toBeInTheDocument()
  })

  it('role=null → 显示 "admin" 兜底', () => {
    useAuthStore.setState({ role: null })
    renderHeader()
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('主题切换按钮：light → 显示"暗色"+ aria-pressed=false', () => {
    renderHeader()
    const btn = screen.getByRole('button', { name: '切换到暗色模式' })
    expect(btn).toHaveTextContent('暗色')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })

  it('点击主题按钮 → theme 变 dark', async () => {
    const user = userEvent.setup()
    renderHeader()
    await user.click(screen.getByRole('button', { name: '切换到暗色模式' }))
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('dark 态 → aria-pressed=true + 显示"亮色"', () => {
    useThemeStore.setState({ theme: 'dark' })
    renderHeader()
    const btn = screen.getByRole('button', { name: '切换到亮色模式' })
    expect(btn).toHaveTextContent('亮色')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
  })

  it('点击"快捷键"按钮 → 打开帮助弹窗', async () => {
    const user = userEvent.setup()
    renderHeader()
    expect(useShortcutsHelp.getState().helpOpen).toBe(false)
    await user.click(screen.getByText('快捷键'))
    expect(useShortcutsHelp.getState().helpOpen).toBe(true)
  })

  it('点击"退出" → clearAuth + logout + 跳登录', async () => {
    const user = userEvent.setup()
    renderHeader()
    await user.click(screen.getByRole('button', { name: '退出登录' }))
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(mockedLogout).toHaveBeenCalled()
  })

  it('移动端汉堡按钮 → 调 onMenuToggle', async () => {
    const user = userEvent.setup()
    const onMenuToggle = vi.fn()
    renderHeader({ onMenuToggle })
    await user.click(screen.getByRole('button', { name: '打开导航菜单' }))
    expect(onMenuToggle).toHaveBeenCalled()
  })
})