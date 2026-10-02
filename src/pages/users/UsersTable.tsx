import { Badge, ButtonGhost } from '../../components/ui'
import { formatNumber, formatTime } from '../../utils'
import { COLUMNS, TIER_LABELS, quotaUsage } from './constants'
import { USER_STATUS_LABELS } from '../../constants/labels'
import type { UserRow } from '../../types'

/**
 * 用户管理表格 —— 每行可点击"调整配额"打开 Modal。
 */
export interface UsersTableProps {
  rows: UserRow[]
  total: number | undefined
  loading: boolean
  hasError: boolean
  onAdjust: (user: UserRow) => void
}

/** 配额条：两个裸数字摆在一起要靠心算才知道用超了没有。 */
function QuotaMeter({ used, monthly }: { used: number; monthly: number }) {
  const { ratio, tone } = quotaUsage(used, monthly)
  const pct = Math.min(100, Math.round(ratio * 100))
  const bar =
    tone === 'over' ? 'bg-error' : tone === 'warn' ? 'bg-warning' : 'bg-warm-ochre'
  return (
    <div className="min-w-[6rem]">
      <div className="tnum flex items-baseline justify-between gap-2 text-xs">
        <span
          className={
            tone === 'over'
              ? 'font-medium text-error'
              : 'text-neutral-600 dark:text-neutral-300'
          }
        >
          {formatNumber(used)}
          <span className="text-neutral-400 dark:text-neutral-500"> / {formatNumber(monthly)}</span>
        </span>
        <span className="text-neutral-400 dark:text-neutral-500">{pct}%</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function UserCell({ user }: { user: UserRow }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-ink dark:text-neutral-100">
        {user.display_name || '未设昵称'}
      </div>
      {/* 27 个用户里只有 2 个有邮箱。邮箱作为昵称的第二行：有人才有，
          不占额外栏宽，也不会像独立列那样铺一屏破折号。 */}
      {user.email ? (
        <div className="truncate text-xs text-neutral-400 dark:text-neutral-500">
          {user.email}
        </div>
      ) : null}
    </div>
  )
}

export function UsersTable({ rows, total, loading, hasError, onAdjust }: UsersTableProps) {
  const emptyText = hasError ? '数据不可用' : '还没有用户'
  const adjustBtn = (user: UserRow) => (
    <ButtonGhost onClick={() => onAdjust(user)}>调整配额</ButtonGhost>
  )

  return (
    <>
      {/* ── 桌面：标准表格 ── */}
      <div
        data-testid="users-table-desktop"
        className="mt-6 hidden overflow-x-auto overscroll-x-contain rounded-lg border border-neutral-200 bg-neutral-50 md:block dark:border-neutral-700 dark:bg-neutral-800/50"
      >
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={[
                    'whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide',
                    col.hideOnNarrow ? 'hidden lg:table-cell' : '',
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
                  <td colSpan={COLUMNS.length} className="px-4 py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-14 text-center text-sm text-neutral-400 dark:text-neutral-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-neutral-100 transition-colors hover:bg-white dark:border-neutral-700/60 dark:hover:bg-neutral-800/40"
                >
                  <td className="tnum whitespace-nowrap px-4 py-2.5 text-xs text-neutral-400 dark:text-neutral-500">
                    {user.id}
                  </td>
                  <td className="max-w-xs px-4 py-2.5">
                    <UserCell user={user} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm text-neutral-600 dark:text-neutral-300">
                    {TIER_LABELS[user.tier ?? ''] ?? user.tier ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge value={user.status} map={USER_STATUS_LABELS} />
                  </td>
                  <td className="tnum whitespace-nowrap px-4 py-2.5 text-sm text-neutral-600 dark:text-neutral-300">
                    {formatNumber(user.monthly_quota)}
                  </td>
                  <td className="px-4 py-2.5">
                    <QuotaMeter used={user.used_quota ?? 0} monthly={user.monthly_quota ?? 0} />
                  </td>
                  <td className="tnum hidden whitespace-nowrap px-4 py-2.5 text-xs text-neutral-400 lg:table-cell dark:text-neutral-500">
                    {formatTime(user.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">{adjustBtn(user)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── 窄屏：卡片流 ── */}
      <div data-testid="users-cards-mobile" className="mt-5 space-y-2 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
            />
          ))
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 py-14 text-center text-sm text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-500">
            {emptyText}
          </div>
        ) : (
          rows.map((user) => (
            <article
              key={user.id}
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50"
            >
              <div className="flex items-start justify-between gap-2">
                <UserCell user={user} />
                <Badge value={user.status} map={USER_STATUS_LABELS} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {TIER_LABELS[user.tier ?? ''] ?? user.tier ?? '—'}
                </span>
                <QuotaMeter used={user.used_quota ?? 0} monthly={user.monthly_quota ?? 0} />
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-neutral-200 pt-2.5 dark:border-neutral-700/60">
                <span className="tnum text-[11px] text-neutral-400 dark:text-neutral-500">
                  #{user.id} · {formatTime(user.created_at)}
                </span>
                {adjustBtn(user)}
              </div>
            </article>
          ))
        )}
      </div>

      {!loading && rows.length > 0 && (
        <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
          共 {formatNumber(total)} 条
        </p>
      )}
    </>
  )
}
