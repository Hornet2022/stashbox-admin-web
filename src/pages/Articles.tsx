import { useState, type FormEvent } from 'react'
import {
  createArticle,
  deleteAdminArticle,
  downloadCsv,
  forceRetryArticle,
  invalidateAudio,
  listArticles,
} from '../api/admin'
import { toErrorMessage } from '../api/client'
import { useApi } from '../hooks/useApi'
import { useRole, hasPermission } from '../hooks/useRole'
import { toast } from '../store/toast'
import { ErrorNotice } from '../components/ui'
import { ArticlesToolbar } from './articles/ArticlesToolbar'
import { ArticlesTable } from './articles/ArticlesTable'
import { ArticleActionModal } from './articles/ArticleActionModal'
import { CreateArticleDrawer } from './articles/CreateArticleDrawer'
import type { ActionKind } from './articles/constants'
import type { ArticleRow } from '../types'

/**
 * 文章管理页（拆分后主控）。
 *
 * 数据流：useApi 拉列表 → Toolbar/Table/Modal/Drawer 渲染 + 回调 → 协调状态
 *
 * 子组件（pages/articles/）：
 *   - constants.ts      COLUMNS / STATUSES / renderTags / ActionKind
 *   - ArticlesToolbar   头部 + 筛选表单 + CSV 导出按钮
 *   - ArticlesTable     列表渲染 + 行内动作按钮
 *   - ArticleActionModal 危险操作弹窗（retry/invalidate/delete 共用）
 *   - CreateArticleDrawer 新建文章抽屉
 *
 * API：listArticles / forceRetryArticle / invalidateAudio / deleteAdminArticle / createArticle / downloadCsv
 *
 * CP-NEW.6：原 562 行单文件 → 拆分后 ~150 行主控 + 5 子文件。
 */
export function Articles() {
  const role = useRole()
  const canOperate = hasPermission(role, ['super_admin', 'operator'])

  // —— 筛选 ——
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

  // —— 危险操作 Modal ——
  const [action, setAction] = useState<ActionKind | null>(null)
  const [target, setTarget] = useState<ArticleRow | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const openActionModal = (kind: ActionKind, article: ArticleRow) => {
    setAction(kind)
    setTarget(article)
    setReason('')
    setModalError(null)
  }
  const closeActionModal = () => {
    setAction(null)
    setTarget(null)
    setSubmitting(false)
    setModalError(null)
  }

  // —— 新建 Drawer ——
  const [createOpen, setCreateOpen] = useState(false)
  const [createUrl, setCreateUrl] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createTags, setCreateTags] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createModalError, setCreateModalError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const closeCreateDrawer = () => {
    setCreateOpen(false)
    setCreateUrl('')
    setCreateTitle('')
    setCreateTags('')
    setCreateSubmitting(false)
    setCreateModalError(null)
    setShowSuccess(false)
  }

  // —— 行为处理 ——
  const handleApply = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAppliedTag(tag.trim())
  }
  const handleReset = () => {
    setStatus('')
    setTag('')
    setAppliedTag('')
  }
  const handleExportArticles = () => {
    toast('正在导出文章 CSV…', 'info')
    downloadCsv('articles')
  }
  const handleExportFeedback = () => {
    toast('正在导出反馈 CSV…', 'info')
    downloadCsv('feedback')
  }

  const handleSubmitAction = async (e: FormEvent<HTMLFormElement>) => {
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
      } else if (action === 'delete') {
        if (reason.trim().length < 5) {
          throw new Error('删除原因至少 5 个字符（写入审计日志）')
        }
        await deleteAdminArticle(target.id, reason.trim())
        toast(`已删除文章 ${target.id}（蒸馏结果与音频已一并清理）`, 'success')
      } else {
        if (target.audio_id === undefined || target.audio_id === null) {
          throw new Error('该文章没有关联音频，无法失效')
        }
        await invalidateAudio(target.audio_id, reason.trim())
        toast(`已失效音频 · 文章 ${target.id}`, 'success')
      }
      closeActionModal()
      reload()
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn(`[CP-NEW.6] article ${action} failed:`, message)
      setModalError(message)
      setSubmitting(false)
    }
  }

  /** 触发新建表单的 shake 错误动效（沿用 index.css 的 .t-input-wrap.is-error）
   *  实现由 CreateArticleDrawer 在 input.onChange 中按 value 自动清 error 态
   * 这里仅在外层表单提交时负责"触发 shake"：Drawer 已内嵌 ref + 状态机，不需外部触发
   * （Drawer 内部通过 error prop 自身显示错误并由 useApi 错误流驱动）
   */
  const handleSubmitCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!createUrl.trim()) {
      setCreateModalError('URL 不能为空')
      // 触发 Drawer 内 input 的 shake
      const wrap = document.querySelector('.t-input-wrap') as HTMLElement | null
      const input = wrap?.querySelector('.t-input') as HTMLInputElement | null
      if (wrap && input) {
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
          wrap.removeAttribute('data-revert-timer')
        }, 3000)
        wrap.setAttribute('data-revert-timer', String(timer))
      }
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
        closeCreateDrawer()
        reload()
      }, 700)
    } catch (err) {
      const message = toErrorMessage(err)
      console.warn('[CP-NEW.6] createArticle failed:', message)
      setCreateModalError(message)
      setCreateSubmitting(false)
    }
  }

  const rows = data?.items ?? []

  return (
    <div>
      <ArticlesToolbar
        status={status}
        tag={tag}
        appliedTag={appliedTag}
        onStatusChange={setStatus}
        onTagChange={setTag}
        onApply={handleApply}
        onReset={handleReset}
        onReload={reload}
        onExportArticles={handleExportArticles}
        onExportFeedback={handleExportFeedback}
        onCreateClick={() => setCreateOpen(true)}
      />

      {error && <ErrorNotice message={error} missing={missing} onRetry={reload} />}

      <ArticlesTable
        rows={rows}
        total={data?.total}
        loading={loading}
        hasError={!!error}
        canOperate={canOperate}
        onAction={openActionModal}
      />

      <ArticleActionModal
        action={action}
        target={target}
        reason={reason}
        submitting={submitting}
        error={modalError}
        onClose={closeActionModal}
        onReasonChange={setReason}
        onSubmit={handleSubmitAction}
      />

      <CreateArticleDrawer
        open={createOpen}
        url={createUrl}
        title={createTitle}
        tags={createTags}
        submitting={createSubmitting}
        error={createModalError}
        showSuccess={showSuccess}
        onClose={closeCreateDrawer}
        onUrlChange={setCreateUrl}
        onTitleChange={setCreateTitle}
        onTagsChange={setCreateTags}
        onSubmit={handleSubmitCreate}
      />
    </div>
  )
}

export default Articles