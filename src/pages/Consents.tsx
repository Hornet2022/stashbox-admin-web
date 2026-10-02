import { useMemo, useState } from 'react'
import { listConsents } from '../api/admin/consents'
import { useApi } from '../hooks/useApi'
import {
  Badge,
  CaveatBanner,
  EmptyRow,
  ErrorNotice,
  Skeleton,
  buttonGhostClass,
  cellMutedClass,
  cellTextClass,
  cellStrongClass,
  footerCountClass,
  pageHintClass,
  pageTitleClass,
  rowClass,
  tableWrapClass,
  thClass,
  theadClass,
} from '../components/ui'
import { formatTime } from '../utils'
import type { ConsentRow } from '../types'

/**
 * GDPR 同意抽查 —— A7 /admin/consents（接口文档 §2.2）。
 *
 * 隐私端点：仅回显结构化字段（user_id / 两开关 / version / 时间），
 * **不回显 comment 类自由文本**。UI 顶部标「仅结构化字段，自由文本不展示」。
 *
 * 本端点查询不写审计（只读）。
 *
 * CP-NEW.5 完整实现。
 */

const PAGE_SIZE = 50

export function Consents() {
  const [personalizationFilter, setPersonalizationFilter] = useState<'all' | 'on' | 'off'>('all')
  const [page, setPage] = useState(0)

  const filterKey = useMemo(() => `${personalizationFilter}|${page}`, [personalizationFilter, page])

  const state = useApi(
    () =>
      listConsents({
        personalization_enabled:
          personalizationFilter === 'all' ? undefined : personalizationFilter === 'on',
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    filterKey,
  )

  return (
    <div>
      <h1 className={pageTitleClass}>GDPR 同意</h1>
      <p className={pageHintClass}>
        用户对隐私条款的同意记录。这里只展示结构化字段，原始自由文本不回显
      </p>

      <CaveatBanner
        variant="warning"
        title="隐私红线"
        items={[
          '本端点仅返回结构化字段（user_id / 两开关 / version / 时间），无任何自由文本',
          '本端点查询不写审计日志（只读）',
          '展示时禁止与具体用户身份信息（PII）二次关联导出',
        ]}
      />

      {/* 过滤栏 */}
      <div className="mt-5 flex items-center gap-3">
        <div className="t-tabs" role="tablist" aria-label="personalization 过滤">
          {[
            { key: 'all', label: '全部' },
            { key: 'on', label: '已开启' },
            { key: 'off', label: '已关闭' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={personalizationFilter === f.key}
              onClick={() => {
                setPersonalizationFilter(f.key as typeof personalizationFilter)
                setPage(0)
              }}
              className="t-tab"
            >
              {f.label}
            </button>
          ))}
        </div>

        <button type="button" className={buttonGhostClass + ' ml-auto'} onClick={state.reload}>
          刷新
        </button>
      </div>

      {state.error && (
        <ErrorNotice message={state.error} missing={state.missing} onRetry={state.reload} />
      )}

      <div className={tableWrapClass}>
        <table className="w-full text-sm">
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>user_id</th>
              <th className={thClass}>personalization</th>
              <th className={thClass}>cross_user_share</th>
              <th className={thClass}>consent_version</th>
              <th className={thClass}>consent_at</th>
              <th className={thClass}>created_at</th>
            </tr>
          </thead>
          <tbody>
            {state.loading && !state.data ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={rowClass}>
                  <td colSpan={6} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : !state.data || state.data.items.length === 0 ? (
              <EmptyRow colSpan={6} text="无匹配同意记录" />
            ) : (
              state.data.items.map((row) => <ConsentRowItem key={row.user_id} row={row} />)
            )}
          </tbody>
        </table>
      </div>

      <div className={`${footerCountClass} flex items-center justify-between`}>
        <span>
          共 {state.data?.total ?? 0} 条 · 第 {page + 1} /{' '}
          {Math.max(1, Math.ceil((state.data?.total ?? 0) / PAGE_SIZE))} 页
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={buttonGhostClass}
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            上一页
          </button>
          <button
            type="button"
            className={buttonGhostClass}
            onClick={() =>
              setPage(
                Math.min(
                  Math.ceil((state.data?.total ?? 0) / PAGE_SIZE) - 1,
                  page + 1,
                ),
              )
            }
            disabled={
              page >= Math.ceil((state.data?.total ?? 0) / PAGE_SIZE) - 1
            }
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  )
}

function ConsentRowItem({ row }: { row: ConsentRow }) {
  return (
    <tr className={rowClass}>
      <td className={cellStrongClass}>
        <span className="font-mono text-xs">{row.user_id}</span>
      </td>
      <td className={cellTextClass}>
        <Badge value={row.personalization_enabled ? 'enabled' : 'disabled'} />
      </td>
      <td className={cellTextClass}>
        <Badge value={row.cross_user_share_enabled ? 'enabled' : 'disabled'} />
      </td>
      <td className={cellTextClass}>
        <span className="font-mono text-xs">{row.consent_version}</span>
      </td>
      <td className={cellMutedClass}>{formatTime(row.consent_at)}</td>
      <td className={cellMutedClass}>{formatTime(row.created_at)}</td>
    </tr>
  )
}

export default Consents