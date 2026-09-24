import { type FormEvent } from 'react'
import { Field, buttonGhostClass, buttonPrimaryClass, inputClass, pageHintClass, pageTitleClass } from '../../components/ui'
import { TIERS, STATUSES } from './constants'

/**
 * 用户管理 Toolbar —— 头部 + 过滤表单 + 导出 CSV。
 */
export interface UsersToolbarProps {
  keyword: string
  tier: string
  status: string
  onKeywordChange: (v: string) => void
  onTierChange: (v: string) => void
  onStatusChange: (v: string) => void
  onSearch: (e: FormEvent<HTMLFormElement>) => void
  onReset: () => void
  onReload: () => void
  onExport: () => void
}

export function UsersToolbar({
  keyword,
  tier,
  status,
  onKeywordChange,
  onTierChange,
  onStatusChange,
  onSearch,
  onReset,
  onReload,
  onExport,
}: UsersToolbarProps) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={pageTitleClass}>用户管理</h1>
          <p className={pageHintClass}>数据源：GET /api/v1/admin/users</p>
        </div>
        <button type="button" className={buttonGhostClass} onClick={onExport}>
          导出 CSV
        </button>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={onSearch}>
        <div className="w-64">
          <Field label="关键词">
            <input
              type="text"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="邮箱 / 昵称"
              className={inputClass}
            />
          </Field>
        </div>
        <div className="w-36">
          <Field label="套餐">
            <select
              value={tier}
              onChange={(e) => onTierChange(e.target.value)}
              className={inputClass}
            >
              {TIERS.map((t) => (
                <option key={t || 'all'} value={t}>
                  {t || '全部'}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="w-36">
          <Field label="状态">
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s || 'all'} value={s}>
                  {s || '全部'}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button type="submit" className={buttonPrimaryClass}>
          搜索
        </button>
        <button type="button" className={buttonGhostClass} onClick={onReset}>
          重置
        </button>
        <button type="button" className={buttonGhostClass} onClick={onReload}>
          刷新
        </button>
      </form>
    </>
  )
}