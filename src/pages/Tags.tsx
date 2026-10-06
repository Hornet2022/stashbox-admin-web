import { Lock as LockIcon } from 'lucide-react'
import { useState, useRef, type FormEvent } from 'react'
import { createTag, deleteAdminTag, downloadCsv, exportErrorMessage, listTags } from '../api/admin'
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
  ButtonGhost,
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
 * 标签管理页 —— GET /api/v1/tags + POST /api/v1/tags。
 */

const columns = ['ID', '名称', '订阅数', '创建时间', '操作']

export function Tags() {
  const role = useRole()
  const canOperate = hasPermission(role, ['super_admin', 'operator'])
  const { data, loading, error, missing, reload } = useApi(listTags, 'tags')

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
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

  const handleExportTags = () => runExport('tags', '标签')
  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) {
      setModalError('标签名称必填')
      shakeError()
      return
    }
    if (!slug.trim()) {
      setModalError('标签标识（slug）必填')
      shakeError()
      return
    }

    setSubmitting(true)
    setModalError(null)
    try {
      await createTag(slug.trim(), name.trim())
      setShowSuccess(true)
      setTimeout(() => {
        setName('')
        setSlug('')
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
          <p className={pageHintClass}>
            蒸馏对齐文章结构的基础标签集。系统标签参与改写，不能删除
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={buttonGhostClass} onClick={handleExportTags}>
            导出 CSV
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
        <table className="w-full min-w-max text-left text-sm">
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
                  <td className={cellTextClass}>
                    {formatNumber(tag.subscriber_count)}
                  </td>
                  <td className={`${cellMutedClass} whitespace-nowrap`}>
                    {formatTime(tag.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {!canOperate ? (
                      <span className="text-neutral-400">—</span>
                    ) : tag.is_system ? (
                      /* 系统标签不是一个「按了没反应」的禁用按钮。
                         后端对 is_system 恒返 403（蒸馏标签体系依赖这批内置标签），
                         而禁用态靠 opacity-40 压在本来就低对比的幽灵按钮上，
                         肉眼几乎看不出它和旁边能点的删除有什么区别 ——
                         运营会反复点它然后以为系统坏了。
                         直接说清「受保护」，比一个看不见的禁用态有用。 */
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                        <LockIcon size={11} aria-hidden="true" />
                        受保护
                      </span>
                    ) : (
                      <ButtonGhost
                        variant="danger"
                        onClick={() => openDelete(tag)}
                        title="删除标签（订阅关系级联清理）"
                        // 一列都叫「删除」对读屏用户是有歧义的（听不出删的是哪个），
                        // 视觉文字保持两字，无障碍名带上标签名。
                        aria-label={`删除标签 ${tag.name}`}
                      >
                        删除
                      </ButtonGhost>
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
                placeholder="如：机器学习"
                className={`t-input ${inputClass}`}
              />
            </div>
          </Field>
          <Field label="标识（slug）">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="英文标识，如 machine-learning"
              className={inputClass}
              autoComplete="off"
            />
          </Field>

          {modalError && (
            <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm dark:border-error/40 dark:bg-error/10 dark:text-[#E0A0A0]">
              {modalError}
            </p>
          )}

          {showSuccess ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <span
                className="t-success-check text-success-ink"
                data-state="in"
                aria-hidden="true"
              >
                <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 25 L20 35 L38 14" />
                </svg>
              </span>
              <span className="text-sm font-medium text-success-ink">标签已创建</span>
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
          <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm dark:border-error/40 dark:bg-error/10 dark:text-[#E0A0A0]">
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
            <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm dark:border-error/40 dark:bg-error/10 dark:text-[#E0A0A0]">
              {deleteError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className={buttonGhostClass} onClick={closeDelete}>
              取消
            </button>
            <button
              type="submit"
              className={`${buttonPrimaryClass} border-error bg-error text-white hover:bg-error`}
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
