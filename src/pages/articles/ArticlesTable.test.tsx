import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArticlesTable } from './ArticlesTable'
import { renderTags } from './constants'
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

/** 桌面表格作用域。组件同时渲染表格 + 卡片流，两者在真实浏览器里
 *  由 display:none 二选一（辅助技术同样只看到一份），jsdom 不算媒体查询，
 *  所以查询要显式限定到桌面那一侧。 */
function desktop() {
  return within(screen.getByTestId('articles-table-desktop'))
}

describe('ArticlesTable', () => {
  // 标签 / 质量分两列按数据决定显不显示：全表为空时它们只会在每一行
  // 渲染一个「—」，占掉两百多像素却零信息量。数据到了列自然回来。
  it('数据里有 tags / quality_score → 渲染全部 7 列', () => {
    render(<ArticlesTable rows={[baseRow]} total={1} loading={false} hasError={false} canOperate={false} onAction={() => {}} />)
    for (const h of ['ID', '标题', '状态', '标签', '质量分', '创建时间', '操作']) {
      expect(desktop().getByText(h)).toBeInTheDocument()
    }
  })

  it('数据里没有 tags / quality_score → 隐去这两列，不铺一排「—」', () => {
    const bare: ArticleRow = { ...baseRow, tags: [], quality_score: null }
    render(<ArticlesTable rows={[bare]} total={1} loading={false} hasError={false} canOperate={false} onAction={() => {}} />)
    expect(desktop().getByText('标题')).toBeInTheDocument()
    expect(desktop().getByText('状态')).toBeInTheDocument()
    expect(desktop().queryByText('标签')).toBeNull()
    expect(desktop().queryByText('质量分')).toBeNull()
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
    expect(desktop().getByText('测试文章')).toBeInTheDocument()
    expect(desktop().getByText('tech, ai')).toBeInTheDocument()
    expect(desktop().getByText('4.2')).toBeInTheDocument()
    expect(desktop().getByText('已就绪')).toBeInTheDocument()
  })

  it('canOperate=false → 操作列说明无权限，而非只显示一个破折号', () => {
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
    expect(desktop().queryByText('重试')).toBeNull()
    expect(desktop().queryByText('失效音频')).toBeNull()
    expect(desktop().queryByText('删除')).toBeNull()
    // 无权限时给出原因，而不是一个没有上下文的「—」
    expect(desktop().getByText('无操作权限')).toBeInTheDocument()
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
    expect(desktop().getByText('重试')).toBeInTheDocument()
    expect(desktop().getByText('失效音频')).toBeInTheDocument()
    expect(desktop().getByText('删除')).toBeInTheDocument()
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
    await user.click(desktop().getByText('重试'))
    expect(onAction).toHaveBeenCalledWith('retry', baseRow)

    await user.click(desktop().getByText('失效音频'))
    expect(onAction).toHaveBeenCalledWith('invalidate', baseRow)

    await user.click(desktop().getByText('删除'))
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
    const invalidateBtn = desktop().getByText('失效音频') as HTMLButtonElement
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

  it('空数据 + hasError=false → 空态文案', () => {
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
    expect(desktop().getByText('还没有文章')).toBeInTheDocument()
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
    expect(desktop().getByText('数据不可用')).toBeInTheDocument()
  })

  it('renderTags 兼容字符串数组', () => {
    expect(renderTags(['tech', 'ai'])).toBe('tech, ai')
  })

  it('renderTags 兼容 {name} 对象数组', () => {
    expect(renderTags([{ name: '科技' }, { name: 'AI' }] as never)).toBe('科技, AI')
  })

  it('renderTags 空数组 → "—"', () => {
    expect(renderTags([])).toBe('—')
  })
})
