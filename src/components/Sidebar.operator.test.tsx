import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar, navItems } from './Sidebar'
import { useAuthStore } from '../store/auth'

/**
 * operator 视图差异化 —— Sidebar CP-NEW.17。
 *
 * CP-NEW.1：13 个后台页面全部 minRole=super_admin（operator 看不到）
 * CP-NEW.17：去掉 minRole 锁，operator 角色可访问全部后台（读为主）
 *
 * 写动作的权限在页面内 useCanWrite / useCanAnnotate 单独判断。
 */

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: false, role: null, userId: null })
  // 清 sessionStorage（auth store 初次创建会读 sessionStorage 残留）
  sessionStorage.clear()
})

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar —— CP-NEW.17 operator 全后台可见', () => {
  it('未登录 → 不显示任何 nav item', () => {
    renderSidebar()
    expect(screen.queryByText('总览')).toBeNull()
    expect(screen.queryByText('听感池')).toBeNull()
  })

  it('operator 角色 → 可见全部 13 个后台页面（读为主）', () => {
    useAuthStore.setState({ role: 'operator', isAuthenticated: true, userId: 5 })
    renderSidebar()
    // 总览（注：group 标题与 nav label 同名"总览"，故用 getAllByText）
    expect(screen.getAllByText('总览').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('蒸馏耗时')).toBeInTheDocument()
    // 内容运营
    expect(screen.getByText('文章管理')).toBeInTheDocument()
    expect(screen.getByText('标签管理')).toBeInTheDocument()
    expect(screen.getByText('推送队列')).toBeInTheDocument()
    // 用户与系统
    expect(screen.getByText('用户管理')).toBeInTheDocument()
    expect(screen.getByText('LLM 配置')).toBeInTheDocument()
    expect(screen.getByText('TTS 配置')).toBeInTheDocument()
    expect(screen.getByText('审计日志')).toBeInTheDocument()
    // 听感运营
    expect(screen.getByText('听感池')).toBeInTheDocument()
    expect(screen.getByText('评测标注')).toBeInTheDocument()
    expect(screen.getByText('模型路由')).toBeInTheDocument()
    expect(screen.getByText('TTS 盲测')).toBeInTheDocument()
    expect(screen.getByText('多码率统计')).toBeInTheDocument()
    expect(screen.getByText('GDPR 同意')).toBeInTheDocument()
    expect(screen.getByText('A/B 报表')).toBeInTheDocument()
  })

  it('super_admin 角色 → 可见全部 13 个后台页面', () => {
    useAuthStore.setState({ role: 'super_admin', isAuthenticated: true, userId: 1 })
    renderSidebar()
    expect(screen.getByText('听感池')).toBeInTheDocument()
    expect(screen.getByText('模型路由')).toBeInTheDocument()
    expect(screen.getByText('GDPR 同意')).toBeInTheDocument()
  })

  it('admin 角色 → 也可见全部（admin 与 super_admin 兼容）', () => {
    useAuthStore.setState({ role: 'admin', isAuthenticated: true, userId: 2 })
    renderSidebar()
    expect(screen.getByText('听感池')).toBeInTheDocument()
    expect(screen.getByText('A/B 报表')).toBeInTheDocument()
  })

  it('navItems 配置不再有 minRole 锁', () => {
    // 静态校验：所有 navItem 都没有 minRole 字段
    const locked = navItems.filter((i) => i.minRole !== undefined)
    expect(locked).toHaveLength(0)
  })
})