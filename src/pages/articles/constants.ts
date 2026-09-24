import type { ArticleRow } from '../../types'

/** 文章管理列头 */
export const COLUMNS = [
  'ID',
  '标题',
  '状态',
  '标签',
  '质量分',
  '创建时间',
  '操作',
] as const

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