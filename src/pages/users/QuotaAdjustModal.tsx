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
  // ⚠️ 2026-10-03：原来标题只有 email，而 27 个用户里 25 个没有邮箱 ——
  // 对多数用户标题渲染成「调整配额 · 」，正文也没有任何身份信息，
  // 运营点完按钮在弹窗里看不出自己在改谁。这里改成邮箱/昵称/ID 逐级降级，
  // 保证任何数据状态下都至少能认出一个人。
  const who = target
    ? (target.email || target.display_name || `ID ${target.id}`)
    : ''

  return (
    <Modal open={target !== null} title={`调整配额 · ${who}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={onSubmit}>
        {/* 身份条：邮箱/昵称与 ID 同时给出，避免同名或无邮箱时认不出人 */}
        {target && (
          <dl className="rounded-md border border-neutral-200 bg-neutral-100/60 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900/40">
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500 dark:text-neutral-400">用户</dt>
              <dd className="truncate font-medium text-ink dark:text-neutral-100">
                {target.display_name || target.email || '（未设置昵称与邮箱）'}
              </dd>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <dt className="text-neutral-500 dark:text-neutral-400">ID</dt>
              <dd className="tnum font-medium text-ink dark:text-neutral-100">{target.id}</dd>
            </div>
          </dl>
        )}
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