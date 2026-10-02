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
import { SlidingTabs } from "../components/ui"

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
                {/* // 这里原来手写 <div className="t-tabs"> + 一串 .t-tab 按钮，但没有 .t-tabs-pill ——
           // 白色的滑动指示块（index.css:260）只存在于 PushNotifications 那一份手写副本里。
           // 结果是 4 个筛选 tab 里有 3 个没有选中指示：active 态只把字色从灰变黑，
           // 在一条灰底上肉眼几乎分不出来，用户会以为没点上而重复点击。
           // 改用仓库里本来就有的 SlidingTabs 原语，四处统一。 */}
        <SlidingTabs
          items={[
            { key: 'all', label: '全部' },
            { key: 'on', label: '已开启' },
            { key: 'off', label: '已关闭' },
          ]}
          active={personalizationFilter}
          onChange={(k) => {
            setPersonalizationFilter(k as typeof personalizationFilter)
            setPage(0)
          }}
        />

        <button type="button" className={buttonGhostClass + ' sm:ml-auto'} onClick={state.reload}>
          刷新
        </button>
      </div>

      {state.error && (
        <ErrorNotice message={state.error} missing={state.missing} onRetry={state.reload} />
      )}

      <div className={tableWrapClass}>
                {/* w-full 不带 min-w-max 时表格会被压进容器宽度里挤列：375px 下 7 列平均每列 49px，
          中文单元格会被挤成一两个字一行 —— 就是本仓库 f102934 修过的那个竖排。
          带 min-w-max 才是「保持自然宽度 + 横向滚动」，降级方式才对。
          仓库里已有 5 张表是这个写法，这里补齐。 */}
        <table className="w-full min-w-max text-sm">
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