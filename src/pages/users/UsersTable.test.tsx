import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
  // CP-USERS-REALITY：原来这里写 'pro'，但系统里从来没有 pro 这个 tier 值
  // （users.tier 实际只有 free / admin / operator）。用真实值，
  // 免得测试里自造一个不存在的套餐、把「下拉能选到 pro」这种错觉固化下来。
  tier: 'free',
  status: 'active',
  monthly_quota: 1000,
  used_quota: 250,
  created_at: '2024-01-01T00:00:00Z',
}

/** 桌面表格作用域。组件同时渲染表格 + 卡片流（真实浏览器靠 display:none
 *  二选一，jsdom 不算媒体查询），查询要显式限定。 */
function desktop() {
  return within(screen.getByTestId('users-table-desktop'))
}

describe('UsersTable', () => {
  it('列头渲染 8 列，且不再有「角色」「邮箱」', () => {
    render(<UsersTable rows={[]} total={0} loading={false} hasError={false} onAdjust={() => {}} />)
    for (const h of ['ID', '用户', '套餐', '状态', '月配额', '已用', '注册时间', '操作']) {
      expect(desktop().getByText(h)).toBeInTheDocument()
    }
    // 「角色」是后端从 tier 派生的（role = tier if tier in {admin,operator}
    // else "user"），26/27 行恒为 user，admin 那行又和「套餐」列同值 ——
    // 它不是独立字段，渲染它等于把一个函数和它的输入并排放着。
    expect(desktop().queryByText('角色')).toBeNull()
    // 邮箱 27 个用户里只有 2 个有值，合成「用户」列的第二行，不再单开一栏
    expect(desktop().queryByText('邮箱')).toBeNull()
  })

  it('row 渲染昵称 + 邮箱 + 套餐 + 配额', () => {
    render(
      <UsersTable
        rows={[baseUser]}
        total={1}
        loading={false}
        hasError={false}
        onAdjust={() => {}}
      />,
    )
    expect(desktop().getByText('Alice')).toBeInTheDocument()
    expect(desktop().getByText('alice@example.com')).toBeInTheDocument()
    // 套餐显示中文，不再把 free/active 这类内部值丢给运营
    expect(desktop().getByText('免费')).toBeInTheDocument()
    expect(desktop().getByText('1,000')).toBeInTheDocument()
  })

  it('email 为 null → 不渲染空邮箱行', () => {
    render(
      <UsersTable
        rows={[{ ...baseUser, email: null }]}
        total={1}
        loading={false}
        hasError={false}
        onAdjust={() => {}}
      />,
    )
    expect(desktop().queryByText('alice@example.com')).toBeNull()
    expect(desktop().getByText('Alice')).toBeInTheDocument()
  })

  it('配额超支 → 进度条标红并给出百分比', () => {
    render(
      <UsersTable
        rows={[{ ...baseUser, monthly_quota: 100, used_quota: 130 }]}
        total={1}
        loading={false}
        hasError={false}
        onAdjust={() => {}}
      />,
    )
    expect(desktop().getByText('130')).toBeInTheDocument()
    expect(desktop().getByText('100%')).toBeInTheDocument()
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
    expect(desktop().getByText('12,345')).toBeInTheDocument()
    expect(desktop().getByText('9,876')).toBeInTheDocument()
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
    await user.click(desktop().getByText('调整配额'))
    expect(onAdjust).toHaveBeenCalledWith(baseUser)
  })

  it('loading=true → skeleton', () => {
    const { container } = render(
      <UsersTable rows={[]} total={0} loading={true} hasError={false} onAdjust={() => {}} />,
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('空数据 + hasError=false → 空态文案', () => {
    render(<UsersTable rows={[]} total={0} loading={false} hasError={false} onAdjust={() => {}} />)
    expect(desktop().getByText('还没有用户')).toBeInTheDocument()
  })

  it('空数据 + hasError=true → "数据不可用"', () => {
    render(<UsersTable rows={[]} total={0} loading={false} hasError={true} onAdjust={() => {}} />)
    expect(desktop().getByText('数据不可用')).toBeInTheDocument()
  })

  it('display_name 为空 → 显示「未设昵称」而不是空白', () => {
    render(
      <UsersTable
        rows={[{ ...baseUser, display_name: undefined }]}
        total={1}
        loading={false}
        hasError={false}
        onAdjust={() => {}}
      />,
    )
    expect(desktop().getByText('未设昵称')).toBeInTheDocument()
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