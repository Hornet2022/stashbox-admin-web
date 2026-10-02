import { Select, buttonGhostClass, buttonPrimaryClass, inputClass } from '../../components/ui'
import { ARTICLE_STATUS_LABELS, labelFor } from '../../constants/labels'
import type { FormEvent } from 'react'

/**
 * 文章管理页头部 + 筛选表单。
 *
 * 版面上的两个修正：
 *  - 页副标题原来写「数据源：GET /api/v1/articles ｜ 操作：force-retry /
 *    audio-invalidate」，这是开发信息不是运营语言。换成一句话说明这页能干什么。
 *  - 三个按钮原本和标题平铺在一个 flex 行里，justify-between 把「导出 CSV」
 *    甩到最左、「新建文章」甩到最右，中间那个「导出反馈」孤零零悬着。
 *    改成：导出类归为一组（弱），主动作单独占位（强）。
 */
export interface ArticlesToolbarProps {
  status: string
  tag: string
  appliedTag: string
  onStatusChange: (s: string) => void
  onTagChange: (t: string) => void
  onApply: (e: FormEvent<HTMLFormElement>) => void
  onReset: () => void
  onReload: () => void
  onExportArticles: () => void
  onExportFeedback: () => void
  onCreateClick: () => void
}

const STATUS_OPTIONS = ['', 'pending', 'distilling', 'ready', 'failed', 'listened']

export function ArticlesToolbar({
  status,
  tag,
  onStatusChange,
  onTagChange,
  onApply,
  onReset,
  onReload,
  onExportArticles,
  onExportFeedback,
  onCreateClick,
}: ArticlesToolbarProps) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-xl font-semibold text-ink dark:text-neutral-100">
            文章管理
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            剪藏入库的文章。可以对失败的任务重新蒸馏，或让已生成的音频失效重取。
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className={buttonGhostClass}
            onClick={onExportArticles}
            aria-label="导出文章 CSV"
          >
            导出文章
          </button>
          <button
            type="button"
            className={buttonGhostClass}
            onClick={onExportFeedback}
            aria-label="导出用户反馈 CSV"
          >
            导出反馈
          </button>
          <button
            type="button"
            className={buttonPrimaryClass}
            onClick={onCreateClick}
            aria-label="新建文章"
          >
            新建文章
          </button>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={onApply}>
        <div className="w-full sm:w-36">
          <Select
            label="状态"
            value={status}
            onChange={onStatusChange}
            options={STATUS_OPTIONS.map((s) => ({
              value: s,
              label: s ? labelFor(ARTICLE_STATUS_LABELS, s).label : '全部状态',
            }))}
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
            标签
          </label>
          <input
            type="text"
            value={tag}
            onChange={(e) => onTagChange(e.target.value)}
            placeholder="按标签精确匹配"
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className={buttonPrimaryClass} aria-label="应用筛选">
            筛选
          </button>
          <button
            type="button"
            className={buttonGhostClass}
            onClick={onReset}
            aria-label="重置筛选条件"
          >
            重置
          </button>
          <button
            type="button"
            className={buttonGhostClass}
            onClick={onReload}
            aria-label="刷新列表"
          >
            刷新
          </button>
        </div>
      </form>
    </>
  )
}
