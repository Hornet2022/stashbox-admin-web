import { type FormEvent } from 'react'
import { Select, buttonGhostClass, buttonPrimaryClass, inputClass } from '../../components/ui'
import { TIER_LABELS, TIERS, STATUSES } from './constants'
import { USER_STATUS_LABELS, labelFor } from '../../constants/labels'

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
        <div className="min-w-0">
          <h1 className="font-serif text-xl font-semibold text-ink dark:text-neutral-100">
            用户管理
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            查看注册用户与配额使用情况。配额调整会立即影响用户当月的可用次数。
          </p>
        </div>
        <button type="button" className={buttonGhostClass} onClick={onExport}>
          导出 CSV
        </button>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={onSearch}>
        <div className="w-full sm:w-64">
          <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-500 dark:text-neutral-400">
            关键词
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="按邮箱或昵称搜索"
            className={inputClass}
          />
        </div>
        <div className="w-full sm:w-32">
          <Select
            label="套餐"
            value={tier}
            onChange={onTierChange}
            options={TIERS.map((t) => ({
              value: t,
              label: t ? (TIER_LABELS[t] ?? t) : '全部套餐',
            }))}
          />
        </div>
        <div className="w-full sm:w-32">
          <Select
            label="状态"
            value={status}
            onChange={onStatusChange}
            options={STATUSES.map((s) => ({
              value: s,
              label: s ? labelFor(USER_STATUS_LABELS, s).label : '全部状态',
            }))}
          />
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