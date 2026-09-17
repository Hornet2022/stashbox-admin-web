import { useState, type FormEvent } from 'react'
import { forceRetryArticle, invalidateAudio, listArticles } from '../api/admin'
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
  formatTime,
  inputClass,
} from '../components/ui'
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
      } else {
        if (target.audio_id === undefined || target.audio_id === null) {
          throw new Error('该文章没有关联音频，无法失效')
        }
        await invalidateAudio(target.audio_id, reason.trim())
      }
      closeModal()
      reload()
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn(`[CP-ADMIN-2] article ${action} failed:`, message)
      setModalError(message)
      setSubmitting(false)
    }
  }

  const rows = data?.items ?? []

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">文章管理</h1>
      <p className="mt-1 text-sm text-gray-500">
        数据源：GET /api/v1/articles ｜ 操作：force-retry / audio-invalidate
      </p>

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
        <button type="submit" className={buttonPrimaryClass}>
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
                text={error ? '数据不可用' : '暂无文章数据'}
              />
            ) : (
              rows.map((article) => {
                const hasAudio =
                  article.audio_id !== undefined && article.audio_id !== null
                return (
                  <tr key={article.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-500">{article.id}</td>
                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                      {article.title}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={article.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {renderTags(article.tags)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {article.quality_score ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatTime(article.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={buttonGhostClass}
                          onClick={() => openModal('retry', article)}
                        >
                          强制重试
                        </button>
                        <button
                          type="button"
                          className={buttonGhostClass}
                          disabled={!hasAudio}
                          title={hasAudio ? '' : '该文章没有关联音频'}
                          onClick={() => openModal('invalidate', article)}
                        >
                          失效音频
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">共 {data?.total ?? rows.length} 条</p>
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
          <p className="text-sm text-gray-600 truncate">
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
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {modalError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className={buttonGhostClass} onClick={closeModal}>
              取消
            </button>
            <button
              type="submit"
              className={buttonPrimaryClass}
              disabled={submitting}
            >
              {submitting ? '提交中…' : '确认'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Articles
