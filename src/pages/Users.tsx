import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { adjustQuota, downloadCsv, exportErrorMessage, listUsers } from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import { hasPermission, useRole } from '../hooks/useRole'
import { toast } from '../store/toast'
import { ErrorNotice } from '../components/ui'
import { UsersToolbar } from './users/UsersToolbar'
import { UsersTable } from './users/UsersTable'
import { QuotaAdjustModal } from './users/QuotaAdjustModal'
import type { UserRow } from '../types'


/** CSV 导出：fetch + blob，留在应用内并给出成功/失败反馈。
 *  失败必须提示 —— 静默失败会让运营以为导出了一份空文件。 */
async function runExport(kind: Parameters<typeof downloadCsv>[0], label: string) {
  toast(`正在导出${label} CSV…`, 'info')
  try {
    await downloadCsv(kind)
    toast(`${label} CSV 已开始下载`, 'success')
  } catch (err) {
    toast(exportErrorMessage(err), 'error')
  }
}

/**
 * 用户管理页 —— GET /api/v1/admin/users + POST /admin/users/{id}/quota-adjust。
 *
 * CP-NEW.8：原 337 行单文件 → 拆分后 ~130 行主控 + 4 子文件。
 * CP-USERS-REALITY：路由守卫改用 hasPermission（见下）。
 */
export function Users() {
  const role = useRole()
  const navigate = useNavigate()

  // 路由守卫：与后端实际放行的角色对齐。
  //
  // CP-USERS-REALITY：原来是裸比较 `role !== 'super_admin'`。但
  // useRole 同文件体系里的 hasPermission() 已经定义了「admin 视为可访问
  // super_admin 资源」的兼容规则，这里绕过它 → admin 账号点进用户管理
  // 立刻被踢回首页，而后端 ADMIN_TIERS 恰恰只有 {admin, operator}，
  // 根本没有 super_admin 这个值。
  //
  // 后续又收紧成 `['super_admin']`，把 operator 也挡在外面 —— 但
  // GET /admin/users 后端是放行 operator 的（user-service: _ALLOWED_ADMIN_ROLES），
  // 于是 operator 登录后点侧栏「用户管理」被弹回总览，同一份数据后端明明给读。
  // 现在与其余 4 个运营页（Tags/Articles/VoiceLibrary/PushNotifications）保持一致。
  const canWrite = hasPermission(role, ['super_admin', 'operator'])
  useEffect(() => {
    if (role !== null && !canWrite) {
      // 文案里不写 super_admin —— 后端没有这个角色值，写出来会被当成
      // "账号 tier 配错了"去排查，而实际是前端自设的门槛。
      toast('权限不足，仅管理员或运营可访问用户管理', 'error')
      navigate('/dashboard', { replace: true })
    }
  }, [role, canWrite, navigate])

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
  const handleExport = () => runExport('users', '用户')
  const handleQuotaSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!target) return

    const value = Number(quota)
    if (!Number.isFinite(value) || value < 0) {
      setModalError('月配额必须是不小于 0 的数字（0 表示额度耗尽、停用该用户）')
      return
    }
    // CP-USERS-REALITY：后端要求 reason ≥5 字符，这里原来只校验非空，
    // 管理员写个「改」就提交，被后端 400 挡回来。前后端口径必须一致。
    const trimmedReason = reason.trim()
    if (trimmedReason.length < 5) {
      setModalError(`调整原因至少 5 个字符（会写入审计日志），当前 ${trimmedReason.length} 个`)
      return
    }

    setSubmitting(true)
    setModalError(null)
    try {
      await adjustQuota(target.id, value, trimmedReason)
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