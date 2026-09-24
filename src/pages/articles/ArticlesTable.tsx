import {
  Badge,
  EmptyRow,
  TableSkeleton,
  buttonGhostClass,
  cellMutedClass,
  cellStrongClass,
  cellTextClass,
  footerCountClass,
  rowClass,
  tableWrapClass,
  thClass,
  theadClass,
} from '../../components/ui'
import { formatTime } from '../../utils'
import { COLUMNS, renderTags, type ActionKind } from './constants'
import type { ArticleRow } from '../../types'

/**
 * 文章管理表格 —— 每行可触发 retry / invalidate / delete 三种动作（canOperate 控制可操作性）。
 */
export interface ArticlesTableProps {
  rows: ArticleRow[]
  total: number | undefined
  loading: boolean
  hasError: boolean
  canOperate: boolean
  onAction: (kind: ActionKind, article: ArticleRow) => void
}

export function ArticlesTable({
  rows,
  total,
  loading,
  hasError,
  canOperate,
  onAction,
}: ArticlesTableProps) {
  return (
    <>
      <div className={tableWrapClass}>
        <table className="w-full text-left text-sm">
          <thead className={theadClass}>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col} scope="col" className={thClass}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton colSpan={COLUMNS.length} rows={5} />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={COLUMNS.length}
                text={hasError ? '数据不可用' : '暂无文章数据'}
              />
            ) : (
              rows.map((article) => {
                const hasAudio =
                  article.audio_id !== undefined && article.audio_id !== null
                return (
                  <tr key={article.id} className={rowClass}>
                    <td className={cellMutedClass}>{article.id}</td>
                    <td className={`${cellStrongClass} max-w-xs truncate`}>
                      {article.title}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={article.status} />
                    </td>
                    <td className={`${cellTextClass} max-w-xs truncate`}>
                      {renderTags(article.tags)}
                    </td>
                    <td className={cellTextClass}>{article.quality_score ?? '—'}</td>
                    <td className={`${cellMutedClass} whitespace-nowrap`}>
                      {formatTime(article.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {canOperate ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={buttonGhostClass}
                            onClick={() => onAction('retry', article)}
                            aria-label={`强制重试文章 ${article.id}`}
                          >
                            强制重试
                          </button>
                          <button
                            type="button"
                            className={buttonGhostClass}
                            disabled={!hasAudio}
                            title={hasAudio ? '' : '该文章没有关联音频'}
                            onClick={() => onAction('invalidate', article)}
                            aria-label={`失效文章 ${article.id} 的音频`}
                          >
                            失效音频
                          </button>
                          <button
                            type="button"
                            className={`${buttonGhostClass} border-error/40 text-error hover:bg-error/10 dark:text-red-300`}
                            onClick={() => onAction('delete', article)}
                            aria-label={`删除文章 ${article.id}`}
                            title="硬删除：蒸馏结果 + 音频一并清理，不可恢复"
                          >
                            删除
                          </button>
                        </div>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className={footerCountClass}>共 {total ?? rows.length} 条</p>
      )}
    </>
  )
}