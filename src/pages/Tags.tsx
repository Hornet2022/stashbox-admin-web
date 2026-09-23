import { useState, useRef, type FormEvent } from 'react'
import { createTag, deleteAdminTag, downloadCsv, listTags } from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import { useRole, hasPermission } from '../hooks/useRole'
import { toast } from '../store/toast'
import { Modal } from '../components/ui'
import {
  EmptyRow,
  ErrorNotice,
  Field,
  TableSkeleton,
  buttonGhostClass,
  buttonPrimaryClass,
  cellMutedClass,
  cellStrongClass,
  cellTextClass,
  footerCountClass,
  inputClass,
  pageHintClass,
  pageTitleClass,
  rowClass,
  tableWrapClass,
  thClass,
  theadClass,
} from '../components/ui'
import { formatNumber, formatTime } from '../utils'
import type { TagRow } from '../types'

/**
 * 标签管理页 —— GET /api/v1/tags + POST /api/v1/tags。
 */

const columns = ['ID', '名称', '描述', '订阅数', '创建时间', '操作']

export function Tags() {
  const role = useRole()
  const canOperate = hasPermission(role, ['super_admin', 'operator'])
  const { data, loading, error, missing, reload } = useApi(listTags, 'tags')

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // CP-DELETE：删除标签（确认弹窗 + 原因必填 ≥5 字符，与后端校验对齐）
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const openDelete = (tag: TagRow) => {
    setDeleteTarget(tag)
    setDeleteReason('')
    setDeleteError(null)
  }

  const closeDelete = () => {
    setDeleteTarget(null)
    setDeleteSubmitting(false)
    setDeleteError(null)
  }

  const handleDelete = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!deleteTarget) return
    if (deleteReason.trim().length < 5) {
      setDeleteError('删除原因至少 5 个字符（会写入审计日志）')
      return
    }
    setDeleteSubmitting(true)
    setDeleteError(null)
    try {
      await deleteAdminTag(deleteTarget.id, deleteReason.trim())
      toast(`已删除标签「${deleteTarget.name}」`, 'success')
      closeDelete()
      reload()
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('[CP-DELETE] deleteTag failed:', message)
      setDeleteError(message)
      setDeleteSubmitting(false)
    }
  }

  const closeModal = () => {
    setOpen(false)
    setSubmitting(false)
    setModalError(null)
    setShowSuccess(false)
  }

  const nameInputRef = useRef<HTMLInputElement>(null)

  const shakeError = () => {
    const wrap = nameInputRef.current?.closest('.t-input-wrap') as HTMLElement | null
    const input = nameInputRef.current
    if (!wrap || !input) return
    const revertKey = 'data-revert-timer'
    const existing = wrap.getAttribute(revertKey)
    if (existing) clearTimeout(Number(existing))
    wrap.classList.add('is-error')
    input.classList.add('is-error')
    input.classList.remove('is-shaking')
    void input.offsetWidth
    input.classList.add('is-shaking')
    const shakeMs = 80 * 2 + 60 * 2
    setTimeout(() => input.classList.remove('is-shaking'), shakeMs + 20)
    const timer = setTimeout(() => {
      wrap.classList.remove('is-error')
      input.classList.remove('is-error')
      wrap.removeAttribute(revertKey)
    }, 3000)
    wrap.setAttribute(revertKey, String(timer))
  }

  /** CSV 导出：走 window.location 触发浏览器原生下载 */
  const handleExportTags = () => {
    toast('正在导出标签 CSV…', 'info')
    downloadCsv('tags')
  }

  const handleExportSubscriptions = () => {
    if (!window.confirm('将导出全量订阅用户，确认？')) return
    toast('正在导出订阅用户 CSV…', 'info')
    downloadCsv('subscriptions')
  }

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) {
      setModalError('标签名称必填')
      shakeError()
      return
    }

    setSubmitting(true)
    setModalError(null)
    try {
      await createTag(name.trim())
      setShowSuccess(true)
      setTimeout(() => {
        setName('')
        setDescription('')
        closeModal()
        reload()
      }, 700)
      reload()
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('[CP-ADMIN-3] createTag failed:', message)
      setModalError(message)
      setSubmitting(false)
    }
  }

  const rows = data?.items ?? []

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={pageTitleClass}>标签管理</h1>
          <p className={pageHintClass}>数据源：GET /api/v1/tags</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={buttonGhostClass} onClick={handleExportTags}>
            导出 CSV
          </button>
          <button type="button" className={buttonGhostClass} onClick={handleExportSubscriptions}>
            导出订阅
          </button>
          {canOperate && (
            <button
              type="button"
              className={buttonPrimaryClass}
              onClick={() => setOpen(true)}
            >
              新增标签
            </button>
          )}
        </div>
      </div>

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      <div className={tableWrapClass}>
        <table className="w-full text-left text-sm">
          <thead className={theadClass}>
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col" className={thClass}>
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
                text={error ? '数据不可用' : '暂无标签数据'}
              />
            ) : (
              rows.map((tag) => (
                <tr key={tag.id} className={rowClass}>
                  <td className={cellMutedClass}>{tag.slug ?? tag.id}</td>
                  <td className={`${cellStrongClass} font-medium`}>
                    {tag.name}
                    {tag.is_system && (
                      <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
                        系统
                      </span>
                    )}
                  </td>
                  <td className={cellTextClass}>{tag.description ?? '—'}</td>
                  <td className={cellTextClass}>
                    {formatNumber(tag.subscriber_count)}
                  </td>
                  <td className={`${cellMutedClass} whitespace-nowrap`}>
                    {formatTime(tag.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {canOperate ? (
                      <button
                        type="button"
                        className={`${buttonGhostClass} border-error/40 text-error hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-red-300`}
                        disabled={tag.is_system}
                        title={
                          tag.is_system
                            ? '系统标签不可删除（蒸馏标签体系依赖）'
                            : '删除标签（订阅关系级联清理）'
                        }
                        onClick={() => openDelete(tag)}
                        aria-label={`删除标签 ${tag.name}`}
                      >
                        删除
                      </button>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className={footerCountClass}>共 {data?.total ?? rows.length} 条</p>
      )}

      <Modal open={open} title="新增标签" onClose={closeModal}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Field label="名称">
            <div className="t-input-wrap">
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  const wrap = nameInputRef.current?.closest('.t-input-wrap') as HTMLElement | null
                  const input = nameInputRef.current
                  if (wrap?.classList.contains('is-error') && e.target.value.trim()) {
                    const revertKey = 'data-revert-timer'
                    const existing = wrap.getAttribute(revertKey)
                    if (existing) clearTimeout(Number(existing))
                    wrap.classList.remove('is-error')
                    input?.classList.remove('is-error')
                  }
                }}
                placeholder="如：machine-learning"
                className={`t-input ${inputClass}`}
              />
            </div>
          </Field>
          <Field label="描述（可选）">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>

          {modalError && (
            <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {modalError}
            </p>
          )}

          {showSuccess ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <span
                className="t-success-check text-emerald-500"
                data-state="in"
                aria-hidden="true"
              >
                <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 25 L20 35 L38 14" />
                </svg>
              </span>
              <span className="text-sm font-medium text-success">标签已创建</span>
            </div>
          ) : (
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" className={buttonGhostClass} onClick={closeModal}>
                取消
              </button>
              <button
                type="submit"
                className={buttonPrimaryClass}
                disabled={submitting}
              >
                {submitting ? '提交中…' : '创建'}
              </button>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title={`删除标签 · ${deleteTarget?.name ?? ''}`}
        onClose={closeDelete}
      >
        <form className="space-y-4" onSubmit={handleDelete}>
          <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            删除后该标签的订阅关系一并清除；已蒸馏文章上的历史标签文本不受影响。
          </p>
          <Field label="删除原因">
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              placeholder="至少 5 个字符，会写入审计日志"
              className={inputClass}
            />
          </Field>

          {deleteError && (
            <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {deleteError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className={buttonGhostClass} onClick={closeDelete}>
              取消
            </button>
            <button
              type="submit"
              className={`${buttonPrimaryClass} border-error bg-error text-white hover:bg-red-700`}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? '删除中…' : '确认删除'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Tags
