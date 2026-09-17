import { useState, type FormEvent } from 'react'
import { createTag, listTags } from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import {
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

/**
 * 标签管理页 —— GET /api/v1/tags + POST /api/v1/tags。
 */

const columns = ['ID', '名称', '描述', '订阅数', '创建时间']

export function Tags() {
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

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) {
      setModalError('标签名称必填')
      return
    }

    setSubmitting(true)
    setModalError(null)
    try {
      await createTag(name.trim(), description.trim() || undefined)
      setName('')
      setDescription('')
      closeModal()
      reload()
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('[CP-ADMIN-2] createTag failed:', message)
      setModalError(message)
      setSubmitting(false)
    }
  }

  const rows = data?.items ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">标签管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            数据源：GET /api/v1/tags
          </p>
        </div>
        <button
          type="button"
          className={buttonPrimaryClass}
          onClick={() => setOpen(true)}
        >
          新增标签
        </button>
      </div>

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
                text={error ? '数据不可用' : '暂无标签数据'}
              />
            ) : (
              rows.map((tag) => (
                <tr key={tag.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-500">{tag.id}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {tag.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {tag.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatNumber(tag.subscriber_count)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatTime(tag.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">共 {data?.total ?? rows.length} 条</p>
      )}

      <Modal open={open} title="新增标签" onClose={closeModal}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Field label="名称">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：machine-learning"
              className={inputClass}
            />
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
              {submitting ? '提交中…' : '创建'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Tags
