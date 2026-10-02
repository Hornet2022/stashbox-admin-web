import { ButtonGhost, shortId } from '../../components/ui'
import { ARTICLE_STATUS_LABELS, labelFor } from '../../constants/labels'
import { formatTime } from '../../utils'
import {
  ALL_COLUMNS,
  renderTags,
  visibleColumns,
  type ActionKind,
  type ColumnSpec,
} from './constants'
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
  // 骨架屏时还没有数据可判断，渲染全部列（里面本来都是灰条，不会有信息损失）
  const cols = loading ? ALL_COLUMNS : visibleColumns(rows)
  const has = (k: ColumnSpec['key']) => cols.some((c) => c.key === k)

  const emptyRow = hasError ? '数据不可用' : '还没有文章'

  /** 行内动作 —— 桌面表格和移动卡片共用，保证两处能力完全一致 */
  const renderActions = (article: ArticleRow, hasAudio: boolean) =>
    canOperate ? (
      <div className="flex flex-wrap items-center gap-1.5">
        <ButtonGhost onClick={() => onAction('retry', article)}>重试</ButtonGhost>
        <ButtonGhost
          onClick={() => onAction('invalidate', article)}
          disabled={!hasAudio}
          title={hasAudio ? '让音频失效，下次访问时重新拉取' : '这篇文章还没有关联音频'}
        >
          失效音频
        </ButtonGhost>
        {/* 破坏性动作和常规动作之间留一道分隔线 + 左侧留白：
            三个等距并排的按钮里，「删除」和「重试」长得一样，误点代价却完全不同。 */}
        <span
          aria-hidden="true"
          className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700"
        />
        <ButtonGhost
          variant="danger"
          onClick={() => onAction('delete', article)}
          title="硬删除：蒸馏结果与音频一并清理，不可恢复"
        >
          删除
        </ButtonGhost>
      </div>
    ) : (
      <span className="text-xs text-neutral-300 dark:text-neutral-600">无操作权限</span>
    )

  return (
    <>
      {/* ── 桌面：标准表格 ── */}
      <div
        data-testid="articles-table-desktop"
        className="mt-6 hidden overflow-x-auto overscroll-x-contain rounded-lg border border-neutral-200 bg-neutral-50 md:block dark:border-neutral-700 dark:bg-neutral-800/50"
      >
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <tr>
              {cols.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={[
                    'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap',
                    col.hideOnNarrow ? 'hidden xl:table-cell' : '',
                  ].join(' ')}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-neutral-100 dark:border-neutral-700/60">
                  <td colSpan={cols.length} className="px-4 py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={cols.length}
                  className="px-4 py-14 text-center text-sm text-neutral-400 dark:text-neutral-500"
                >
                  {emptyRow}
                </td>
              </tr>
            ) : (
              rows.map((article) => {
                const hasAudio =
                  article.audio_id !== undefined && article.audio_id !== null
                const status = labelFor(ARTICLE_STATUS_LABELS, article.status)
                return (
                  <tr
                    key={article.id}
                    className="border-t border-neutral-100 transition-colors hover:bg-white dark:border-neutral-700/60 dark:hover:bg-neutral-800/40"
                  >
                    {has('id') && (
                      <td className="hidden px-4 py-2.5 xl:table-cell">
                        <code
                          className="tnum text-xs text-neutral-400 dark:text-neutral-500"
                          title={String(article.id)}
                        >
                          {shortId(article.id, 6)}
                        </code>
                      </td>
                    )}
                    {has('title') && (
                      <td className="max-w-md px-4 py-2.5">
                        <div
                          className="t-clamp-2 text-sm font-medium leading-snug text-ink dark:text-neutral-100"
                          title={article.title}
                        >
                          {article.title}
                        </div>
                      </td>
                    )}
                    {has('status') && (
                      <td className="px-4 py-2.5">
                        <StatusPill tone={status.tone ?? 'stone'} label={status.label} />
                      </td>
                    )}
                    {has('tags') && (
                      <td className="hidden max-w-xs px-4 py-2.5 text-sm text-neutral-600 xl:table-cell dark:text-neutral-300">
                        <span className="t-clamp-1">{renderTags(article.tags)}</span>
                      </td>
                    )}
                    {has('score') && (
                      <td className="tnum hidden px-4 py-2.5 text-sm text-neutral-600 xl:table-cell dark:text-neutral-300">
                        {article.quality_score ?? '—'}
                      </td>
                    )}
                    {has('created') && (
                      <td
                        className="tnum hidden whitespace-nowrap px-4 py-2.5 text-xs text-neutral-400 xl:table-cell dark:text-neutral-500"
                      >
                        {formatTime(article.created_at)}
                      </td>
                    )}
                    {has('actions') && (
                      <td className="px-4 py-2.5">
                        {renderActions(article, hasAudio)}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 窄屏：卡片流 ──
          表格在 390px 下无论怎么调都会把「状态」「操作」挤出视口 —— 标题列
          再怎么限宽，横向滚动的成本也远高于直接换成卡片。
          卡片保证：标题、状态、时间、操作四项在首屏内全部可见可点。 */}
      <div data-testid="articles-cards-mobile" className="mt-5 space-y-2 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
            />
          ))
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 py-14 text-center text-sm text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-500">
            {emptyRow}
          </div>
        ) : (
          rows.map((article) => {
            const hasAudio =
              article.audio_id !== undefined && article.audio_id !== null
            const status = labelFor(ARTICLE_STATUS_LABELS, article.status)
            return (
              <article
                key={article.id}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="t-clamp-2 flex-1 text-sm font-medium leading-snug text-ink dark:text-neutral-100">
                    {article.title}
                  </h3>
                  <StatusPill tone={status.tone ?? 'stone'} label={status.label} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                  <code className="tnum" title={String(article.id)}>
                    {shortId(article.id, 4)}
                  </code>
                  <span className="tnum">{formatTime(article.created_at)}</span>
                  {has('tags') && has('score') && (
                    <span className="t-clamp-1 max-w-[10rem]">
                      {renderTags(article.tags)} · {article.quality_score ?? '—'}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 border-t border-neutral-200 pt-2.5 dark:border-neutral-700/60">
                  {renderActions(article, hasAudio)}
                </div>
              </article>
            )
          })
        )}
      </div>

      {!loading && rows.length > 0 && (
        <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
          共 {total ?? rows.length} 条
        </p>
      )}
    </>
  )
}

function StatusPill({ tone, label }: { tone: string; label: string }) {
  const tones: Record<string, string> = {
    sage: 'bg-[#6B8E7F]/10 text-[#4F6E60] dark:text-[#8FAE9E]',
    amber: 'bg-[#C4956A]/15 text-[#96693C] dark:text-[#D4A87C]',
    clay: 'bg-[#B87070]/12 text-[#9A5454] dark:text-[#D09393]',
    ochre: 'bg-warm-ochre/12 text-warm-ochre',
    stone: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        tones[tone] ?? tones.stone
      }`}
    >
      {label}
    </span>
  )
}
