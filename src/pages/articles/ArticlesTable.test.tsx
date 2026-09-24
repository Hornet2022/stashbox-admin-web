import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArticlesTable } from './ArticlesTable'
import type { ArticleRow } from '../../types'

/**
 * ArticlesTable 单测 —— CP-NEW.13。
 *
 * 覆盖：列渲染 / 操作回调 / canOperate=false 时不显示动作 / loading skeleton / 空态。
 */

const baseRow: ArticleRow = {
  id: 1,
  title: '测试文章',
  status: 'ready',
  tags: ['tech', 'ai'],
  quality_score: 4.2,
  audio_id: 100,
  created_at: '2024-01-15T08:30:00Z',
}

describe('ArticlesTable', () => {
  it('列头渲染 7 列', () => {
    render(<ArticlesTable rows={[]} total={0} loading={false} hasError={false} canOperate={false} onAction={() => {}} />)
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('标题')).toBeInTheDocument()
    expect(screen.getByText('状态')).toBeInTheDocument()
    expect(screen.getByText('标签')).toBeInTheDocument()
    expect(screen.getByText('质量分')).toBeInTheDocument()
    expect(screen.getByText('创建时间')).toBeInTheDocument()
    expect(screen.getByText('操作')).toBeInTheDocument()
  })

  it('row 渲染标题 + 标签 + 状态 Badge + 质量分', () => {
    render(
      <ArticlesTable
        rows={[baseRow]}
        total={1}
        loading={false}
        hasError={false}
        canOperate={false}
        onAction={() => {}}
      />,
    )
    expect(screen.getByText('测试文章')).toBeInTheDocument()
    expect(screen.getByText('tech, ai')).toBeInTheDocument()
    expect(screen.getByText('4.2')).toBeInTheDocument()
    expect(screen.getByText('ready')).toBeInTheDocument()
  })

  it('canOperate=false → 操作列显示 "—" 而非按钮', () => {
    render(
      <ArticlesTable
        rows={[baseRow]}
        total={1}
        loading={false}
        hasError={false}
        canOperate={false}
        onAction={() => {}}
      />,
    )
    expect(screen.queryByText('强制重试')).toBeNull()
    expect(screen.queryByText('失效音频')).toBeNull()
    expect(screen.queryByText('删除')).toBeNull()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('canOperate=true → 行内 3 个动作按钮', () => {
    render(
      <ArticlesTable
        rows={[baseRow]}
        total={1}
        loading={false}
        hasError={false}
        canOperate={true}
        onAction={() => {}}
      />,
    )
    expect(screen.getByText('强制重试')).toBeInTheDocument()
    expect(screen.getByText('失效音频')).toBeInTheDocument()
    expect(screen.getByText('删除')).toBeInTheDocument()
  })

  it('点击动作 → 回调传 (kind, row)', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <ArticlesTable
        rows={[baseRow]}
        total={1}
        loading={false}
        hasError={false}
        canOperate={true}
        onAction={onAction}
      />,
    )
    await user.click(screen.getByText('强制重试'))
    expect(onAction).toHaveBeenCalledWith('retry', baseRow)

    await user.click(screen.getByText('失效音频'))
    expect(onAction).toHaveBeenCalledWith('invalidate', baseRow)

    await user.click(screen.getByText('删除'))
    expect(onAction).toHaveBeenCalledWith('delete', baseRow)
  })

  it('失效音频按钮在 audio_id 缺失时禁用', () => {
    const rowNoAudio: ArticleRow = { ...baseRow, audio_id: null }
    render(
      <ArticlesTable
        rows={[rowNoAudio]}
        total={1}
        loading={false}
        hasError={false}
        canOperate={true}
        onAction={() => {}}
      />,
    )
    const invalidateBtn = screen.getByText('失效音频') as HTMLButtonElement
    expect(invalidateBtn.disabled).toBe(true)
  })

  it('loading=true → 显示 skeleton', () => {
    const { container } = render(
      <ArticlesTable
        rows={[]}
        total={0}
        loading={true}
        hasError={false}
        canOperate={false}
        onAction={() => {}}
      />,
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('空数据 + hasError=false → "暂无文章数据"', () => {
    render(
      <ArticlesTable
        rows={[]}
        total={0}
        loading={false}
        hasError={false}
        canOperate={false}
        onAction={() => {}}
      />,
    )
    expect(screen.getByText('暂无文章数据')).toBeInTheDocument()
  })

  it('空数据 + hasError=true → "数据不可用"', () => {
    render(
      <ArticlesTable
        rows={[]}
        total={0}
        loading={false}
        hasError={true}
        canOperate={false}
        onAction={() => {}}
      />,
    )
    expect(screen.getByText('数据不可用')).toBeInTheDocument()
  })

  it('renderTags 兼容字符串数组', () => {
    render(
      <ArticlesTable
        rows={[{ ...baseRow, tags: ['a', 'b', 'c'] }]}
        total={1}
        loading={false}
        hasError={false}
        canOperate={false}
        onAction={() => {}}
      />,
    )
    expect(screen.getByText('a, b, c')).toBeInTheDocument()
  })

  it('renderTags 兼容 {name} 对象数组', () => {
    render(
      <ArticlesTable
        rows={[
          {
            ...baseRow,
            tags: [
              { id: 1, name: 'tag-1' } as unknown as string,
              { id: 2, name: 'tag-2' } as unknown as string,
            ] as unknown as ArticleRow['tags'],
          },
        ]}
        total={1}
        loading={false}
        hasError={false}
        canOperate={false}
        onAction={() => {}}
      />,
    )
    expect(screen.getByText('tag-1, tag-2')).toBeInTheDocument()
  })

  it('renderTags 空数组 → "—"', () => {
    render(
      <ArticlesTable
        rows={[{ ...baseRow, tags: [] }]}
        total={1}
        loading={false}
        hasError={false}
        canOperate={false}
        onAction={() => {}}
      />,
    )
    // '—' 同时是 tags 列空态和质量分 null 时的兜底
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})