import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { adjustQuota, downloadCsv, listUsers } from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import { useRole } from '../hooks/useRole'
import { toast } from '../store/toast'
import {
  Badge,
  EmptyRow,
  ErrorNotice,
  Field,
  TableSkeleton,
  Modal,
  buttonGhostClass,
  buttonPrimaryClass,
  cellMutedClass,
  cellStrongClass,
  cellTextClass,
  footerCountClass,
  formatNumber,
  formatTime,
  inputClass,
  pageHintClass,
  pageTitleClass,
  rowClass,
  tableWrapClass,
  thClass,
  theadClass,
} from '../components/ui'
import type { UserRow } from '../types'

/**
 * 用户管理页 —— GET /api/v1/admin/users + POST /admin/users/{id}/quota-adjust。
 */

const columns = [
  'ID',
  '邮箱',
  '昵称',
  '角色',
  '套餐',
  '状态',
  '月配额',
  '已用',
  '注册时间',
  '操作',
]

const TIERS = ['', 'free', 'pro', 'max']
const STATUSES = ['', 'active', 'suspended', 'deleted']

export function Users() {
  const role = useRole()
  const navigate = useNavigate()

  // 路由守卫：只对 super_admin 开放
  useEffect(() => {
    if (role !== null && role !== 'super_admin') {
      toast('权限不足，仅 super_admin 可访问用户管理', 'error')
      navigate('/dashboard', { replace: true })
    }
  }, [role, navigate])

  const [keyword, setKeyword] = useState('')
  const [tier, setTier] = useState('')
  const [status, setStatus] = useState('')
  // 已提交的搜索词（点“搜索”才生效）
  const [appliedKeyword, setAppliedKeyword] = useState('')

  const queryKey = `${appliedKeyword}|${tier}|${status}`
  const { data, loading, error, missing, reload } = useApi(
    () =>
      listUsers({
        keyword: appliedKeyword || undefined,
        tier: tier || undefined,
        status: status || undefined,
        page: 1,
        size: 50,
      }),
    queryKey,
  )

  // 配额调整弹窗
  const [target, setTarget] = useState<UserRow | null>(null)
  const [quota, setQuota] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const openQuotaModal = (user: UserRow) => {
    setTarget(user)
    setQuota(String(user.monthly_quota ?? 0))
    setReason('')
    setModalError(null)
  }

  const closeQuotaModal = () => {
    setTarget(null)
    setSubmitting(false)
    setModalError(null)
  }

  /** CSV 导出：走 window.location 触发浏览器原生下载 */
  const handleExport = () => {
    toast('正在导出用户 CSV…', 'info')
    downloadCsv('users')
  }

  const handleQuotaSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!target) return

    const value = Number(quota)
    if (!Number.isFinite(value) || value < 0) {
      setModalError('月配额必须是不小于 0 的数字')
      return
    }
    if (!reason.trim()) {
      setModalError('请填写调整原因（会写入审计日志）')
      return
    }

    setSubmitting(true)
    setModalError(null)
    try {
      await adjustQuota(target.id, value, reason.trim())
      toast(`已调整 ${target.email} 的月配额为 ${value}`, 'success')
      closeQuotaModal()
      reload()
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('[CP-ADMIN-3] adjustQuota failed:', message)
      setModalError(message)
      setSubmitting(false)
    }
  }

  const rows = data?.items ?? []

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={pageTitleClass}>用户管理</h1>
          <p className={pageHintClass}>数据源：GET /api/v1/admin/users</p>
        </div>
        <button type="button" className={buttonGhostClass} onClick={handleExport}>
          导出 CSV
        </button>
      </div>

      {/* 过滤条 */}
      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setAppliedKeyword(keyword.trim())
        }}
      >
        <div className="w-64">
          <Field label="关键词">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="邮箱 / 昵称"
              className={inputClass}
            />
          </Field>
        </div>
        <div className="w-36">
          <Field label="套餐">
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
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
              onChange={(e) => setStatus(e.target.value)}
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
        <button
          type="button"
          className={buttonGhostClass}
          onClick={() => {
            setKeyword('')
            setAppliedKeyword('')
            setTier('')
            setStatus('')
          }}
        >
          重置
        </button>
        <button type="button" className={buttonGhostClass} onClick={reload}>
          刷新
        </button>
      </form>

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      <div className={tableWrapClass}>
        <table className="w-full text-left text-sm">
          <thead className={theadClass}>
            <tr>
              {columns.map((col) => (
                <th key={col} className={thClass}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton colSpan={columns.length} rows={5} />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={columns.length}
                text={error ? '数据不可用' : '暂无用户数据'}
              />
            ) : (
              rows.map((user) => (
                <tr key={user.id} className={rowClass}>
                  <td className={cellMutedClass}>{user.id}</td>
                  <td className={cellStrongClass}>{user.email}</td>
                  <td className={cellTextClass}>{user.display_name ?? '—'}</td>
                  <td className={cellTextClass}>{user.role ?? '—'}</td>
                  <td className={cellTextClass}>{user.tier ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge value={user.status} />
                  </td>
                  <td className={cellTextClass}>
                    {formatNumber(user.monthly_quota)}
                  </td>
                  <td className={cellTextClass}>
                    {formatNumber(user.used_quota)}
                  </td>
                  <td className={`${cellMutedClass} whitespace-nowrap`}>
                    {formatTime(user.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openQuotaModal(user)}
                      className={buttonGhostClass}
                    >
                      调整配额
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className={footerCountClass}>
          共 {formatNumber(data?.total)} 条
        </p>
      )}

      <Modal
        open={target !== null}
        title={`调整配额 · ${target?.email ?? ''}`}
        onClose={closeQuotaModal}
      >
        <form className="space-y-4" onSubmit={handleQuotaSubmit}>
          <Field label="月配额（次）">
            <input
              type="number"
              min={0}
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="调整原因">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="会写入审计日志"
              className={inputClass}
            />
          </Field>

          {modalError && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {modalError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={buttonGhostClass}
              onClick={closeQuotaModal}
            >
              取消
            </button>
            <button
              type="submit"
              className={buttonPrimaryClass}
              disabled={submitting}
            >
              {submitting ? '提交中…' : '确认调整'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Users
