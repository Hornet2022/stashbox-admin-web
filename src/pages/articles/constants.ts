import type { ArticleRow } from '../../types'

/**
 * 文章管理列头。
 *
 * 之前「标签」和「质量分」两列在所有行都渲染成一个 `—`：
 * articles.tags 存的是空 JSON 数组，quality_score 全表为 0（只用真实评分，
 * 不写假分）。两列占掉 200 多像素宽度却永远不承载任何信息，
 * 反而把真正重要的标题挤到需要截断。
 *
 * 修法不是静态删列，而是**按数据决定** —— 哪一列全空就不渲染，
 * 数据到了列自然出现。静态删除的话，等标签/评分真的攒够数据，
 * 这一版就变成了功能回退。
 */
export interface ColumnSpec {
  key: 'id' | 'title' | 'status' | 'tags' | 'score' | 'created' | 'actions'
  label: string
  /** 窄屏隐藏。只给次要列用；状态和操作绝不能加。 */
  hideOnNarrow?: boolean
}

export const ALL_COLUMNS: ColumnSpec[] = [
  { key: 'id', label: 'ID', hideOnNarrow: true },
  { key: 'title', label: '标题' },
  { key: 'status', label: '状态' },
  { key: 'tags', label: '标签', hideOnNarrow: true },
  { key: 'score', label: '质量分', hideOnNarrow: true },
  { key: 'created', label: '创建时间', hideOnNarrow: true },
  { key: 'actions', label: '操作' },
]

/** 根据当前数据决定渲染哪些列：整列为空的直接不出现。 */
export function visibleColumns(rows: ArticleRow[]): ColumnSpec[] {
  const hasTags = rows.some((r) => {
    const t = r.tags
    return Array.isArray(t) && t.length > 0
  })
  const hasScore = rows.some((r) => typeof r.quality_score === 'number')
  return ALL_COLUMNS.filter(
    (c) => (c.key !== 'tags' || hasTags) && (c.key !== 'score' || hasScore)
  )
}

/** 状态过滤可选项（空 = 全部） */
export const STATUSES = ['', 'pending', 'distilling', 'ready', 'failed', 'listened'] as const

/** 标签字段兼容 string[] 与 {id,name}[] 两种形态 */
export function renderTags(tags: ArticleRow['tags']): string {
  if (!tags || tags.length === 0) return '—'
  return tags
    .map((t) => (typeof t === 'string' ? t : t?.name ?? ''))
    .filter(Boolean)
    .join(', ')
}

/** 表格行内可触发的动作 */
export type ActionKind = 'retry' | 'invalidate' | 'delete'
