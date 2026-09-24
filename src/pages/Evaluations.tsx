import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  annotateEvaluation,
  getAgreement,
  listEvaluations,
} from '../api/admin/evaluations'
import { useApi } from '../hooks/useApi'
import { useCanAnnotate } from '../hooks/useRole'
import { toast } from '../store/toast'
import {
  Badge,
  EmptyRow,
  ErrorNotice,
  MetricCard,
  Skeleton,
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
import type {
  Evaluation,
  EvaluationAnnotationPayload,
} from '../types'

/**
 * 评测标注 —— A3 /admin/evaluations + /admin/evaluations/{id}/annotate + /agreement。
 *
 * 契约注意（接口文档 §2.2）：list 响应**不含** comment / evaluator_id。
 * 如要展示标注归属必须改后端契约（CP-NEW.3 不做）。
 *
 * 上线硬前提：alembic 0029（evaluator_id 列）。
 *
 * CP-NEW.3 完整实现。
 */

const PAGE_SIZE = 50

export function Evaluations() {
  const [autoFlagFilter, setAutoFlagFilter] = useState<'all' | 'user' | 'system'>('all')
  const [minScore, setMinScore] = useState('')
  const [taskIdFilter, setTaskIdFilter] = useState('')
  const [page, setPage] = useState(0)
  const [annotateTarget, setAnnotateTarget] = useState<Evaluation | null>(null)

  // CP-NEW.17：operator + super_admin 可标注，其他角色只读
  const canAnnotate = useCanAnnotate()

  const filterKey = useMemo(
    () => `${autoFlagFilter}|${minScore}|${taskIdFilter}|${page}`,
    [autoFlagFilter, minScore, taskIdFilter, page],
  )

  const listState = useApi(
    () =>
      listEvaluations({
        auto_flag: autoFlagFilter === 'user' ? false : autoFlagFilter === 'system' ? true : undefined,
        min_score: minScore ? Number(minScore) : undefined,
        task_id: taskIdFilter.trim() || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    filterKey,
  )

  const agreementState = useApi(() => getAgreement(), 'agreement')

  // 过滤变更 → 回到第一页
  useEffect(() => {
    setPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFlagFilter, minScore, taskIdFilter])

  // 提交标注后刷新列表 + agreement
  const reloadAll = () => {
    listState.reload()
    agreementState.reload()
  }

  return (
    <div>
      <h1 className={pageTitleClass}>评测标注</h1>
      <p className={pageHintClass}>
        数据源：GET /api/v1/admin/evaluations · /evaluations/agreement · POST /evaluations/{'{id}'}/annotate
      </p>

      {/* 一致性卡 */}
      <div className="mt-6">
        {agreementState.error ? (
          <ErrorNotice
            message={agreementState.error}
            missing={agreementState.missing}
            onRetry={agreementState.reload}
          />
        ) : (
          <AgreementCard data={agreementState.data} loading={agreementState.loading} />
        )}
      </div>

      {/* 列表 */}
      <div className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
            评分列表
          </h2>
          <button
            type="button"
            className={`${buttonGhostClass} flex items-center gap-1.5 text-xs`}
            onClick={reloadAll}
          >
            <RefreshCw size={12} />
            刷新
          </button>
        </div>

        {/* 过滤栏 */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="t-tabs" role="tablist" aria-label="auto_flag 过滤">
            {[
              { key: 'all', label: '全部' },
              { key: 'user', label: '用户提交' },
              { key: 'system', label: '系统自动' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={autoFlagFilter === f.key}
                onClick={() => setAutoFlagFilter(f.key as typeof autoFlagFilter)}
                className="t-tab"
              >
                {f.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            最低 overall
            <input
              type="number"
              min={1}
              max={5}
              step={0.1}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="1-5"
              className={`${inputClass} w-20 py-1 text-xs`}
            />
          </label>

          <label className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            task_id
            <input
              type="text"
              value={taskIdFilter}
              onChange={(e) => setTaskIdFilter(e.target.value)}
              placeholder="dst_xxx"
              className={`${inputClass} w-40 py-1 text-xs font-mono`}
            />
          </label>
        </div>

        {listState.error && (
          <ErrorNotice
            message={listState.error}
            missing={listState.missing}
            onRetry={listState.reload}
          />
        )}

        <div className={tableWrapClass}>
          <table className="w-full text-sm">
            <thead className={theadClass}>
              <tr>
                <th className={thClass}>id</th>
                <th className={thClass}>task_id</th>
                <th className={thClass}>hook</th>
                <th className={thClass}>section</th>
                <th className={thClass}>outro</th>
                <th className={thClass}>rhythm</th>
                <th className={thClass}>overall</th>
                <th className={thClass}>skip</th>
                <th className={thClass}>auto</th>
                <th className={thClass}>created</th>
                <th className={thClass}>
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listState.loading && !listState.data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={rowClass}>
                    <td colSpan={11} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : !listState.data || listState.data.items.length === 0 ? (
                <EmptyRow colSpan={11} text="无匹配评分" />
              ) : (
                listState.data.items.map((item) => (
                  <EvaluationRow
                    key={item.id}
                    item={item}
                    canAnnotate={canAnnotate}
                    onAnnotate={() => setAnnotateTarget(item)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={`${footerCountClass} flex items-center justify-between`}>
          <span>
            共 {listState.data?.total ?? 0} 条 · 第 {page + 1} /{' '}
            {Math.max(1, Math.ceil((listState.data?.total ?? 0) / PAGE_SIZE))} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={buttonGhostClass}
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              上一页
            </button>
            <button
              type="button"
              className={buttonGhostClass}
              onClick={() =>
                setPage(
                  Math.min(
                    Math.ceil((listState.data?.total ?? 0) / PAGE_SIZE) - 1,
                    page + 1,
                  ),
                )
              }
              disabled={
                page >= Math.ceil((listState.data?.total ?? 0) / PAGE_SIZE) - 1
              }
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* 标注 Modal */}
      <AnnotateDialog
        target={annotateTarget}
        onClose={() => setAnnotateTarget(null)}
        onSubmitted={() => {
          setAnnotateTarget(null)
          reloadAll()
        }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   一致性卡
───────────────────────────────────────────────────────── */

function AgreementCard({
  data,
  loading,
}: {
  data: Awaited<ReturnType<typeof getAgreement>> | null
  loading: boolean
}) {
  const metrics = [
    {
      key: 'agreement',
      label: '一致性',
      value: data?.agreement ?? null,
      unit: '',
      tone:
        data && data.agreement >= 0.8
          ? ('success' as const)
          : data && data.agreement >= 0.6
            ? ('warning' as const)
            : ('error' as const),
    },
    { key: 'evaluator_count', label: '评测员数', value: data?.evaluator_count ?? null, unit: '人' },
    { key: 'annotated_count', label: '已标注', value: data?.annotated_count ?? null, unit: '条' },
  ]

  return (
    <MetricCard
      label="评测员一致性（agreement ≥ 0.8 为校准目标）"
      metrics={metrics}
      loading={loading}
    />
  )
}

/* ─────────────────────────────────────────────────────────
   列表行
───────────────────────────────────────────────────────── */

function EvaluationRow({
  item,
  canAnnotate,
  onAnnotate,
}: {
  item: Evaluation
  canAnnotate: boolean
  onAnnotate: () => void
}) {
  return (
    <tr className={rowClass}>
      <td className={cellMutedClass}>
        <span className="font-mono text-xs">{item.id}</span>
      </td>
      <td className={cellMutedClass}>
        <span className="font-mono text-xs">{item.task_id}</span>
      </td>
      <td className={cellTextClass}>{fmtScore(item.hook_score)}</td>
      <td className={cellTextClass}>{fmtScore(item.section_score)}</td>
      <td className={cellTextClass}>{fmtScore(item.outro_score)}</td>
      <td className={cellTextClass}>{fmtScore(item.rhythm_score)}</td>
      <td className={cellStrongClass}>
        {item.overall_score !== null ? (
          <span
            className={
              item.overall_score >= 4
                ? 'text-success'
                : item.overall_score >= 3
                  ? 'text-warning'
                  : 'text-error'
            }
          >
            {item.overall_score.toFixed(1)}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className={cellTextClass}>{item.skip_reason ?? '—'}</td>
      <td className={cellTextClass}>
        <Badge value={item.auto_flag ? 'system' : 'user'} />
      </td>
      <td className={cellMutedClass}>{formatTime(item.created_at)}</td>
      <td className={cellTextClass}>
        <button
          type="button"
          className={buttonGhostClass}
          onClick={onAnnotate}
          disabled={!canAnnotate}
          title={canAnnotate ? '提交评测员标注' : '权限不足：仅 super_admin / operator 可标注'}
        >
          {canAnnotate ? '标注' : '—'}
        </button>
      </td>
    </tr>
  )
}

function fmtScore(v: number | null): string {
  return v === null ? '—' : v.toFixed(0)
}

/* ─────────────────────────────────────────────────────────
   标注 Modal
───────────────────────────────────────────────────────── */

interface AnnotateDialogProps {
  target: Evaluation | null
  onClose: () => void
  onSubmitted: () => void
}

function AnnotateDialog({ target, onClose, onSubmitted }: AnnotateDialogProps) {
  const [hook, setHook] = useState('')
  const [section, setSection] = useState('')
  const [outro, setOutro] = useState('')
  const [rhythm, setRhythm] = useState('')
  const [overall, setOverall] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // target 变化 → 重置表单
  useEffect(() => {
    if (target) {
      setHook(target.hook_score?.toString() ?? '')
      setSection(target.section_score?.toString() ?? '')
      setOutro(target.outro_score?.toString() ?? '')
      setRhythm(target.rhythm_score?.toString() ?? '')
      setOverall(target.overall_score?.toString() ?? '')
      setComment('')
    }
  }, [target])

  if (!target) return null

  const overallNum = Number(overall)
  const overallValid =
    overall !== '' && Number.isFinite(overallNum) && overallNum >= 1 && overallNum <= 5
  const validOptional = (v: string) =>
    v === '' || (Number.isFinite(Number(v)) && Number(v) >= 1 && Number(v) <= 5)
  const formValid =
    overallValid &&
    validOptional(hook) &&
    validOptional(section) &&
    validOptional(outro) &&
    validOptional(rhythm)

  const handleSubmit = async () => {
    if (!target || !formValid) return
    setSubmitting(true)
    try {
      const payload: EvaluationAnnotationPayload = {
        hook_score: hook === '' ? null : Number(hook),
        section_score: section === '' ? null : Number(section),
        outro_score: outro === '' ? null : Number(outro),
        rhythm_score: rhythm === '' ? null : Number(rhythm),
        overall_score: overallNum,
        comment: comment.trim() || undefined,
      }
      const result = await annotateEvaluation(target.id, payload)
      toast(`已提交标注（${result.id}，evaluator_id=${result.evaluator_id}）`, 'success')
      onSubmitted()
    } catch {
      // 拦截器已 toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-lg border border-neutral-200 bg-neutral-50 shadow-md dark:border-neutral-700 dark:bg-neutral-800"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
          <div>
            <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
              评测员标注
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
              原 id: <span className="font-mono">{target.id}</span> · task:{' '}
              <span className="font-mono">{target.task_id}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200"
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            4 维可空（空 = 不改），给了必须 1-5 整数；overall 必填 1-5。
            提交会写新行（不改原行），evaluator_id 取 JWT sub。
          </p>

          <div className="grid grid-cols-2 gap-3">
            <ScoreField label="hook"     value={hook}     onChange={setHook} />
            <ScoreField label="section"  value={section}  onChange={setSection} />
            <ScoreField label="outro"    value={outro}    onChange={setOutro} />
            <ScoreField label="rhythm"   value={rhythm}   onChange={setRhythm} />
            <ScoreField label="overall *" value={overall} onChange={setOverall} required />
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
              校准备注（可选）
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="例如：hook 实际更强，overall 应该 +0.5"
              className={`${inputClass} mt-1 resize-none`}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3 dark:border-neutral-700">
          <button type="button" className={buttonGhostClass} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={buttonPrimaryClass}
            onClick={handleSubmit}
            disabled={!formValid || submitting}
          >
            {submitting ? '提交中…' : '提交标注'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScoreField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  const v = value === '' ? null : Number(value)
  const valid = value === '' || (Number.isFinite(v) && v !== null && v >= 1 && v <= 5)
  return (
    <label className="block">
      <span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
        {label}
      </span>
      <input
        type="number"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`${inputClass} mt-1 ${valid ? '' : 'border-error/60'}`}
        placeholder="1-5"
      />
    </label>
  )
}

export default Evaluations