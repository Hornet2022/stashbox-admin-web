import { useState, useRef, type FormEvent } from 'react'
import { createTag, downloadCsv, listTags } from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import { useRole, hasPermission } from '../hooks/useRole'
import { toast } from '../store/toast'
import { Drawer } from 'vaul'
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

/**
 * 标签管理页 —— GET /api/v1/tags + POST /api/v1/tags。
 */

const columns = ['ID', '名称', '描述', '订阅数', '创建时间']

export function Tags() {
  const role = useRole()
  const canOperate = hasPermission(role, ['super_admin', 'operator'])
  const { data, loading, error, missing, reload } = useApi(listTags, 'tags')

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const closeModal = () => {
    setOpen(false)
    setSubmitting(false)
    setModalError(null)
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
      toast(`标签「${name.trim()}」已创建`, 'success')
      setName('')
      setDescription('')
      closeModal()
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
                text={error ? '数据不可用' : '暂无标签数据'}
              />
            ) : (
              rows.map((tag) => (
                <tr key={tag.id} className={rowClass}>
                  <td className={cellMutedClass}>{tag.id}</td>
                  <td className={`${cellStrongClass} font-medium`}>{tag.name}</td>
                  <td className={cellTextClass}>{tag.description ?? '—'}</td>
                  <td className={cellTextClass}>
                    {formatNumber(tag.subscriber_count)}
                  </td>
                  <td className={`${cellMutedClass} whitespace-nowrap`}>
                    {formatTime(tag.created_at)}
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

      <Drawer.Root open={open} onOpenChange={(o) => !o && closeModal()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content className="fixed bottom-0 right-0 top-0 z-50 flex flex-col bg-white dark:bg-slate-800 outline-none">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-slate-700">
              <Drawer.Title className="text-base font-semibold text-gray-900 dark:text-slate-100">
                新增标签
              </Drawer.Title>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
            <form className="flex-1 overflow-y-auto px-5 py-4 space-y-4" onSubmit={handleCreate}>
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
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                  {modalError}
                </p>
              )}

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
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}

export default Tags
