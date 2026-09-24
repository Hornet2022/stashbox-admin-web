import {
  Field,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
  pageHintClass,
  pageTitleClass,
} from '../../components/ui'
import type { FormEvent } from 'react'

/**
 * 文章管理页头部 + 筛选表单。
 *
 * - 标题 + 数据源提示
 * - 导出 CSV 按钮（articles / feedback 两个独立按钮，沿用历史）
 * - 「+ 新建文章」按钮（受父组件控制 createOpen）
 * - 状态 select + 标签 input + 应用/重置/刷新按钮
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
        <div>
          <h1 className={pageTitleClass}>文章管理</h1>
          <p className={pageHintClass}>
            数据源：GET /api/v1/articles ｜ 操作：force-retry / audio-invalidate
          </p>
        </div>
        <button
          type="button"
          className={buttonGhostClass}
          onClick={onExportArticles}
          aria-label="导出文章 CSV"
        >
          导出 CSV
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
          + 新建文章
        </button>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={onApply}>
        <div className="w-40">
          <Field label="状态">
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s || 'all'} value={s}>
                  {s || '全部'}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="w-56">
          <Field label="标签">
            <input
              type="text"
              value={tag}
              onChange={(e) => onTagChange(e.target.value)}
              placeholder="标签名"
              className={inputClass}
            />
          </Field>
        </div>
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
      </form>
    </>
  )
}