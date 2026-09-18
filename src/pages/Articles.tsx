import { useState, useRef, type FormEvent } from 'react'
import {
  createArticle,
  downloadCsv,
  forceRetryArticle,
  invalidateAudio,
  listArticles,
} from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import { useRole, hasPermission } from '../hooks/useRole'
import { toast } from '../store/toast'
import { Drawer } from 'vaul'
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
  inputClass,
  pageHintClass,
  pageTitleClass,
  rowClass,
  tableWrapClass,
  thClass,
  theadClass,
} from '../components/ui'
import { formatTime } from '../utils'
import type { ArticleRow } from '../types'

/**
 * 文章管理页。
 *
 * - GET  /api/v1/articles                      列表（复用用户端 API）
 * - POST /api/v1/admin/articles/{id}/force-retry   强制重试
 * - POST /api/v1/admin/audio/{id}/invalidate       音频失效
 */

const columns = [
  'ID',
  '标题',
  '状态',
  '标签',
  '质量分',
  '创建时间',
  '操作',
]

const STATUSES = ['', 'pending', 'processing', 'completed', 'failed']

/** 标签字段兼容 string[] 与 {id,name}[] 两种形态 */
function renderTags(tags: ArticleRow['tags']): string {
  if (!tags || tags.length === 0) return '—'
  return tags
    .map((t) => (typeof t === 'string' ? t : t?.name ?? ''))
    .filter(Boolean)
    .join(', ')
}

type ActionKind = 'retry' | 'invalidate'

export function Articles() {
  const role = useRole()
  const canOperate = hasPermission(role, ['super_admin', 'operator'])
  const [status, setStatus] = useState('')
  const [tag, setTag] = useState('')
  const [appliedTag, setAppliedTag] = useState('')

  const queryKey = `${status}|${appliedTag}`
  const { data, loading, error, missing, reload } = useApi(
    () =>
      listArticles({
        status: status || undefined,
        tag: appliedTag || undefined,
        page: 1,
        size: 50,
      }),
    queryKey,
  )

  const [action, setAction] = useState<ActionKind | null>(null)
  const [target, setTarget] = useState<ArticleRow | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const openModal = (kind: ActionKind, article: ArticleRow) => {
    setAction(kind)
    setTarget(article)
    setReason('')
    setModalError(null)
  }

  const closeModal = () => {
    setAction(null)
    setTarget(null)
    setSubmitting(false)
    setModalError(null)
  }

  const [createOpen, setCreateOpen] = useState(false)
  const [createUrl, setCreateUrl] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createTags, setCreateTags] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createModalError, setCreateModalError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const closeCreateModal = () => {
    setCreateOpen(false)
    setCreateUrl('')
    setCreateTitle('')
    setCreateTags('')
    setCreateSubmitting(false)
    setCreateModalError(null)
    setShowSuccess(false)
  }

  const createUrlRef = useRef<HTMLInputElement>(null)

  const shakeError = () => {
    const wrap = createUrlRef.current?.closest('.t-input-wrap') as HTMLElement | null
    const input = createUrlRef.current
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

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!createUrl.trim()) {
      setCreateModalError('URL 不能为空')
      shakeError()
      return
    }
    setCreateSubmitting(true)
    setCreateModalError(null)
    try {
      await createArticle(
        createUrl.trim(),
        'url',
        createTitle.trim() || undefined,
      )
      setShowSuccess(true)
      setTimeout(() => {
        closeCreateModal()
        reload()
      }, 700)
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('[CP-ADMIN-3] createArticle failed:', message)
      setCreateModalError(message)
      setCreateSubmitting(false)
    }
  }

  /** CSV 导出：走 window.location 触发浏览器原生下载 */
  const handleExportArticles = () => {
    toast('正在导出文章 CSV…', 'info')
    downloadCsv('articles')
  }

  const handleExportFeedback = () => {
    toast('正在导出反馈 CSV…', 'info')
    downloadCsv('feedback')
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!action || !target) return
    if (!reason.trim()) {
      setModalError('请填写操作原因（会写入审计日志）')
      return
    }

    setSubmitting(true)
    setModalError(null)
    try {
      if (action === 'retry') {
        await forceRetryArticle(target.id, reason.trim())
        toast(`已提交强制重试 · 文章 ${target.id}`, 'success')
      } else {
        if (target.audio_id === undefined || target.audio_id === null) {
          throw new Error('该文章没有关联音频，无法失效')
        }
        await invalidateAudio(target.audio_id, reason.trim())
        toast(`已失效音频 · 文章 ${target.id}`, 'success')
      }
      closeModal()
      reload()
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn(`[CP-ADMIN-3] article ${action} failed:`, message)
      setModalError(message)
      setSubmitting(false)
    }
  }

  const rows = data?.items ?? []

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={pageTitleClass}>文章管理</h1>
          <p className={pageHintClass}>
            数据源：GET /api/v1/articles ｜ 操作：force-retry / audio-invalidate
          </p>
        </div>
        <button type="button" className={buttonGhostClass} onClick={handleExportArticles} aria-label="导出文章 CSV">
          导出 CSV
        </button>
        <button type="button" className={buttonGhostClass} onClick={handleExportFeedback} aria-label="导出用户反馈 CSV">
          导出反馈
        </button>
        <button
          type="button"
          className={buttonPrimaryClass}
          onClick={() => setCreateOpen(true)}
          aria-label="新建文章"
        >
          + 新建文章
        </button>
      </div>

      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setAppliedTag(tag.trim())
        }}
      >
        <div className="w-40">
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
        <div className="w-56">
          <Field label="标签">
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="标签名"
              className={inputClass}
            />
          </Field>
        </div>
        <button type="submit" className={buttonPrimaryClass} aria-label="应用筛选">
          筛选
        </button>
        <button
          type="button"
          className={buttonGhostClass}
          onClick={() => {
            setStatus('')
            setTag('')
            setAppliedTag('')
          }}
          aria-label="重置筛选条件"
        >
          重置
        </button>
        <button type="button" className={buttonGhostClass} onClick={reload} aria-label="刷新列表">
          刷新
        </button>
      </form>

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
                text={error ? '数据不可用' : '暂无文章数据'}
              />
            ) : (
              rows.map((article) => {
                const hasAudio =
                  article.audio_id !== undefined && article.audio_id !== null
                return (
                  <tr key={article.id} className={rowClass}>
                    <td className={cellMutedClass}>{article.id}</td>
                    <td className={`${cellStrongClass} max-w-xs truncate`}>
                      {article.title}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={article.status} />
                    </td>
                    <td className={`${cellTextClass} max-w-xs truncate`}>
                      {renderTags(article.tags)}
                    </td>
                    <td className={cellTextClass}>
                      {article.quality_score ?? '—'}
                    </td>
                    <td className={`${cellMutedClass} whitespace-nowrap`}>
                      {formatTime(article.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {canOperate ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={buttonGhostClass}
                            onClick={() => openModal('retry', article)}
                            aria-label={`强制重试文章 ${article.id}`}
                          >
                            强制重试
                          </button>
                          <button
                            type="button"
                            className={buttonGhostClass}
                            disabled={!hasAudio}
                            title={hasAudio ? '' : '该文章没有关联音频'}
                            onClick={() => openModal('invalidate', article)}
                            aria-label={`失效文章 ${article.id} 的音频`}
                          >
                            失效音频
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className={footerCountClass}>共 {data?.total ?? rows.length} 条</p>
      )}

      <Modal
        open={action !== null}
        title={
          action === 'retry'
            ? `强制重试 · 文章 ${target?.id ?? ''}`
            : `失效音频 · 文章 ${target?.id ?? ''}`
        }
        onClose={closeModal}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <p className="truncate text-sm text-gray-600 dark:text-slate-300">
            {target?.title ?? ''}
          </p>
          <Field label="操作原因">
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
            <button type="button" className={buttonGhostClass} onClick={closeModal} aria-label="取消操作">
              取消
            </button>
            <button
              type="submit"
              className={buttonPrimaryClass}
              disabled={submitting}
              aria-label="确认提交"
            >
              {submitting ? '提交中…' : '确认'}
            </button>
          </div>
        </form>
      </Modal>

      <Drawer.Root open={createOpen} onOpenChange={(open) => !open && closeCreateModal()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content className="fixed bottom-0 right-0 top-0 z-50 flex flex-col bg-white dark:bg-slate-800 outline-none">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-slate-700">
              <Drawer.Title className="text-base font-semibold text-gray-900 dark:text-slate-100">
                新建文章
              </Drawer.Title>
              <button
                type="button"
                onClick={closeCreateModal}
                className="text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
            <form className="flex-1 overflow-y-auto px-5 py-4 space-y-4" onSubmit={handleCreate}>
              <Field label="URL *">
                <div className="t-input-wrap">
                  <input
                    ref={createUrlRef}
                    type="url"
                    value={createUrl}
                    onChange={(e) => {
                      setCreateUrl(e.target.value)
                      const wrap = createUrlRef.current?.closest('.t-input-wrap') as HTMLElement | null
                      const input = createUrlRef.current
                      if (wrap?.classList.contains('is-error') && e.target.value.trim()) {
                        const revertKey = 'data-revert-timer'
                        const existing = wrap.getAttribute(revertKey)
                        if (existing) clearTimeout(Number(existing))
                        wrap.classList.remove('is-error')
                        input?.classList.remove('is-error')
                      }
                    }}
                    placeholder="https://..."
                    className={`t-input ${inputClass}`}
                  />
                </div>
              </Field>
              <Field label="标题（可选）">
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="文章标题"
                  className={inputClass}
                />
              </Field>
              <Field label="标签（可选）">
                <input
                  type="text"
                  value={createTags}
                  onChange={(e) => setCreateTags(e.target.value)}
                  placeholder="标签，多个用逗号分隔"
                  className={inputClass}
                />
              </Field>

              {createModalError && (
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                  {createModalError}
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
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">文章已创建</span>
                </div>
              ) : (
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" className={buttonGhostClass} onClick={closeCreateModal} aria-label="取消新建">
                  取消
                </button>
                <button
                  type="submit"
                  className={buttonPrimaryClass}
                  disabled={createSubmitting}
                  aria-label="确认创建文章"
                >
                  {createSubmitting ? '提交中…' : '创建'}
                </button>
              </div>
              )}
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}

export default Articles
