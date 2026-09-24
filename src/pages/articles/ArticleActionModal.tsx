import { type FormEvent } from 'react'
import { Field, Modal, buttonGhostClass, buttonPrimaryClass, inputClass } from '../../components/ui'
import type { ArticleRow } from '../../types'
import type { ActionKind } from './constants'

/**
 * 危险操作 Modal（retry / invalidate / delete 共用）。
 *
 * reason 必填，delete 类型额外要求 ≥5 字符（写入审计日志约束）。
 */
export interface ArticleActionModalProps {
  action: ActionKind | null
  target: ArticleRow | null
  reason: string
  submitting: boolean
  error: string | null
  onClose: () => void
  onReasonChange: (reason: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

function titleFor(action: ActionKind | null, target: ArticleRow | null): string {
  if (!action) return ''
  return action === 'retry'
    ? `强制重试 · 文章 ${target?.id ?? ''}`
    : action === 'delete'
      ? `删除文章 · ${target?.id ?? ''}`
      : `失效音频 · 文章 ${target?.id ?? ''}`
}

export function ArticleActionModal({
  action,
  target,
  reason,
  submitting,
  error,
  onClose,
  onReasonChange,
  onSubmit,
}: ArticleActionModalProps) {
  return (
    <Modal
      open={action !== null}
      title={titleFor(action, target)}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <p className="truncate text-sm text-neutral-600 dark:text-neutral-300">
          {target?.title ?? ''}
        </p>
        {action === 'delete' && (
          <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            硬删除：蒸馏结果、音频文件、收藏/稍后听/收听进度一并清除，
            <strong>不可恢复</strong>；已消耗的生成配额不返还。
          </p>
        )}
        <Field label="操作原因">
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            placeholder="会写入审计日志"
            className={inputClass}
          />
        </Field>

        {error && (
          <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={buttonGhostClass}
            onClick={onClose}
            aria-label="取消操作"
          >
            取消
          </button>
          <button
            type="submit"
            className={
              action === 'delete'
                ? `${buttonPrimaryClass} border-error bg-error text-white hover:bg-red-700`
                : buttonPrimaryClass
            }
            disabled={submitting}
            aria-label="确认提交"
          >
            {submitting
              ? '提交中…'
              : action === 'delete'
                ? '确认删除'
                : '确认'}
          </button>
        </div>
      </form>
    </Modal>
  )
}