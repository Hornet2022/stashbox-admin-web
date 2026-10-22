import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'
// Vite 的 ?raw：把源文件当字符串导入（vite/client 提供了类型声明，
// 不需要把 node 类型加进 app 的 tsconfig）
import sidebarSource from './Sidebar.tsx?raw'
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
    useAuthStore.setState({ role: 'admin', isAuthenticated: true, userId: 1 })
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

  it('minRole 死字段已彻底移除', () => {
    // 2026-10-22：minRole 原来是个**死字段** —— 所有 navItem 都没设它，
    // 过滤恒为全通过，什么也没挡住。而它表达的那套角色等级
    // （admin / super_admin / operator / viewer）后端**根本不存在**
    // （后端只有 admin / operator 两档，且同权）。
    //
    // 所以字段整个删掉了，连同过滤逻辑。
    // 这条改成**源码级**断言：Sidebar.tsx 里不许再出现 minRole ——
    // 否则它会以「留作窄门标记」的名义被加回来，变成一个永远不挡人的门槛。
    // 先把注释剥掉 —— 注释里可以**提到** minRole（解释它为什么被删），
    // 断言要管的是「代码里不许再出现这个字段」。
    const code = sidebarSource
      .replace(/\/\*[\s\S]*?\*\//g, '')  // 块注释
      .replace(/\/\/.*$/gm, '')             // 行注释
    // ⚠️ 用词边界：裸 /minRole/ 会匹配到 **AdminRole** 里的子串
    // （"Ad" + "minRole"），那是误报。
    expect(code).not.toMatch(/\bminRole\b/)
    expect(code).not.toMatch(/item\.minRole/)
  })
})