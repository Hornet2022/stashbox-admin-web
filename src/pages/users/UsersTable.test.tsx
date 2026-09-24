import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsersTable } from './UsersTable'
import type { UserRow } from '../../types'

/**
 * UsersTable 单测 —— CP-NEW.13。
 *
 * 覆盖：列渲染 / 配额列 / 调整配额回调 / 空态 / loading skeleton。
 */

const baseUser: UserRow = {
  id: 1,
  email: 'alice@example.com',
  display_name: 'Alice',
  role: 'user',
  tier: 'pro',
  status: 'active',
  monthly_quota: 1000,
  used_quota: 250,
  created_at: '2024-01-01T00:00:00Z',
}

describe('UsersTable', () => {
  it('列头渲染 10 列', () => {
    render(<UsersTable rows={[]} total={0} loading={false} hasError={false} onAdjust={() => {}} />)
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('邮箱')).toBeInTheDocument()
    expect(screen.getByText('昵称')).toBeInTheDocument()
    expect(screen.getByText('角色')).toBeInTheDocument()
    expect(screen.getByText('套餐')).toBeInTheDocument()
    expect(screen.getByText('状态')).toBeInTheDocument()
    expect(screen.getByText('月配额')).toBeInTheDocument()
    expect(screen.getByText('已用')).toBeInTheDocument()
    expect(screen.getByText('注册时间')).toBeInTheDocument()
    expect(screen.getByText('操作')).toBeInTheDocument()
  })

  it('row 渲染邮箱 / 昵称 / 角色 / 配额', () => {
    render(
      <UsersTable
        rows={[baseUser]}
        total={1}
        loading={false}
        hasError={false}
        onAdjust={() => {}}
      />,
    )
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('user')).toBeInTheDocument()
    expect(screen.getByText('pro')).toBeInTheDocument()
    expect(screen.getByText('1,000')).toBeInTheDocument()
    expect(screen.getByText('250')).toBeInTheDocument()
  })

  it('配额数字走千分位（≥1000）', () => {
    render(
      <UsersTable
        rows={[{ ...baseUser, monthly_quota: 12345, used_quota: 9876 }]}
        total={1}
        loading={false}
        hasError={false}
        onAdjust={() => {}}
      />,
    )
    expect(screen.getByText('12,345')).toBeInTheDocument()
    expect(screen.getByText('9,876')).toBeInTheDocument()
  })

  it('点击调整配额 → onAdjust(user) 回调', async () => {
    const user = userEvent.setup()
    const onAdjust = vi.fn()
    render(
      <UsersTable
        rows={[baseUser]}
        total={1}
        loading={false}
        hasError={false}
        onAdjust={onAdjust}
      />,
    )
    await user.click(screen.getByText('调整配额'))
    expect(onAdjust).toHaveBeenCalledWith(baseUser)
  })

  it('loading=true → skeleton', () => {
    const { container } = render(
      <UsersTable rows={[]} total={0} loading={true} hasError={false} onAdjust={() => {}} />,
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('空数据 + hasError=false → "暂无用户数据"', () => {
    render(<UsersTable rows={[]} total={0} loading={false} hasError={false} onAdjust={() => {}} />)
    expect(screen.getByText('暂无用户数据')).toBeInTheDocument()
  })

  it('空数据 + hasError=true → "数据不可用"', () => {
    render(<UsersTable rows={[]} total={0} loading={false} hasError={true} onAdjust={() => {}} />)
    expect(screen.getByText('数据不可用')).toBeInTheDocument()
  })

  it('display_name 为空 → 显示 "—"', () => {
    render(
      <UsersTable
        rows={[{ ...baseUser, display_name: undefined }]}
        total={1}
        loading={false}
        hasError={false}
        onAdjust={() => {}}
      />,
    )
    // 昵称列显示 "—"
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('footer 显示总条数（千分位）', () => {
    render(
      <UsersTable
        rows={[baseUser, { ...baseUser, id: 2 }, { ...baseUser, id: 3 }]}
        total={1234}
        loading={false}
        hasError={false}
        onAdjust={() => {}}
      />,
    )
    expect(screen.getByText(/共 1,234 条/)).toBeInTheDocument()
  })
})