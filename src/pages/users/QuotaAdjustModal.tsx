import { type FormEvent } from 'react'
import { Field, Modal, buttonGhostClass, buttonPrimaryClass, inputClass } from '../../components/ui'
import type { UserRow } from '../../types'

/**
 * 用户配额调整 Modal —— 月配额（数字）+ reason（≥1 字符，会写入审计日志）。
 */
export interface QuotaAdjustModalProps {
  target: UserRow | null
  quota: string
  reason: string
  submitting: boolean
  error: string | null
  onClose: () => void
  onQuotaChange: (v: string) => void
  onReasonChange: (v: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export function QuotaAdjustModal({
  target,
  quota,
  reason,
  submitting,
  error,
  onClose,
  onQuotaChange,
  onReasonChange,
  onSubmit,
}: QuotaAdjustModalProps) {
  return (
    <Modal
      open={target !== null}
      title={`调整配额 · ${target?.email ?? ''}`}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="月配额（次）">
          <input
            type="number"
            min={0}
            value={quota}
            onChange={(e) => onQuotaChange(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="调整原因">
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
          >
            取消
          </button>
          <button
            type="submit"
            className={buttonPrimaryClass}
            disabled={submitting}
          >
            {submitting ? '提交中…' : '确认调整'}
          </button>
        </div>
      </form>
    </Modal>
  )
}