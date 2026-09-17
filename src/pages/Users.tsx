import { useState, type FormEvent } from 'react'
import { adjustQuota, listUsers } from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import {
  Badge,
  EmptyRow,
  ErrorNotice,
  Field,
  Loading,
  Modal,
  buttonGhostClass,
  buttonPrimaryClass,
  formatNumber,
  formatTime,
  inputClass,
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
      closeQuotaModal()
      reload()
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('[CP-ADMIN-2] adjustQuota failed:', message)
      setModalError(message)
      setSubmitting(false)
    }
  }

  const rows = data?.items ?? []

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
      <p className="mt-1 text-sm text-gray-500">
        数据源：GET /api/v1/admin/users
      </p>

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

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <Loading colSpan={columns.length} />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={columns.length}
                text={error ? '数据不可用' : '暂无用户数据'}
              />
            ) : (
              rows.map((user) => (
                <tr key={user.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-500">{user.id}</td>
                  <td className="px-4 py-3 text-gray-900">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.display_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.role ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{user.tier ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge value={user.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatNumber(user.monthly_quota)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatNumber(user.used_quota)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
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
        <p className="mt-3 text-xs text-gray-400">
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
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
