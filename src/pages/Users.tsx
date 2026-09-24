import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { adjustQuota, downloadCsv, listUsers } from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import { useRole } from '../hooks/useRole'
import { toast } from '../store/toast'
import { ErrorNotice } from '../components/ui'
import { UsersToolbar } from './users/UsersToolbar'
import { UsersTable } from './users/UsersTable'
import { QuotaAdjustModal } from './users/QuotaAdjustModal'
import type { UserRow } from '../types'

/**
 * 用户管理页 —— GET /api/v1/admin/users + POST /admin/users/{id}/quota-adjust。
 *
 * 路由守卫：只对 super_admin 开放（与 Sidebar minRole 一致 —— 本页内置二次跳转兜底）。
 *
 * CP-NEW.8：原 337 行单文件 → 拆分后 ~130 行主控 + 4 子文件。
 */
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

  // —— 筛选 ——
  const [keyword, setKeyword] = useState('')
  const [tier, setTier] = useState('')
  const [status, setStatus] = useState('')
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

  // —— 配额调整 Modal ——
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

  // —— 行为处理 ——
  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAppliedKeyword(keyword.trim())
  }
  const handleReset = () => {
    setKeyword('')
    setAppliedKeyword('')
    setTier('')
    setStatus('')
  }
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
      console.warn('[CP-NEW.8] adjustQuota failed:', message)
      setModalError(message)
      setSubmitting(false)
    }
  }

  const rows = data?.items ?? []

  return (
    <div>
      <UsersToolbar
        keyword={keyword}
        tier={tier}
        status={status}
        onKeywordChange={setKeyword}
        onTierChange={setTier}
        onStatusChange={setStatus}
        onSearch={handleSearch}
        onReset={handleReset}
        onReload={reload}
        onExport={handleExport}
      />

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      <UsersTable
        rows={rows}
        total={data?.total}
        loading={loading}
        hasError={!!error}
        onAdjust={openQuotaModal}
      />

      <QuotaAdjustModal
        target={target}
        quota={quota}
        reason={reason}
        submitting={submitting}
        error={modalError}
        onClose={closeQuotaModal}
        onQuotaChange={setQuota}
        onReasonChange={setReason}
        onSubmit={handleQuotaSubmit}
      />
    </div>
  )
}

export default Users