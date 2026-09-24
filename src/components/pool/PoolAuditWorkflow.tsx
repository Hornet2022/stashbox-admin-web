import { useEffect, useState } from 'react'
import {
  cleanupPool,
  getAuditSample,
  postAuditResult,
} from '../../api/admin/few-shot-pool'
import { useStepper } from '../../hooks/useStepper'
import { toast } from '../../store/toast'
import {
  Badge,
  ReasonDialog,
  Skeleton,
  Stepper,
  buttonGhostClass,
  buttonPrimaryClass,
} from '../ui'
import type {
  PoolAuditSampleItem,
  PoolAuditResult,
  PoolCleanupResult,
} from '../../types'

/**
 * 池清理 + 抽查工作流 —— A6 /admin/few-shot-pool/{cleanup,audit-sample,audit-result}。
 *
 * 3 步 stepper：
 *   ① cleanup：危险操作（ReasonDialog，reason ≥5 字符），成功后展示删除计数
 *   ② audit-sample：拉一批条目（默认 10），逐条打分
 *   ③ audit-result：提交当前条评分，展示新均值 vs 旧均值，自动取下一批
 */
const STEPS = [
  { key: 'cleanup', label: '清理' },
  { key: 'sample', label: '抽查样本' },
  { key: 'result', label: '提交评分' },
] as const

export function PoolAuditWorkflow() {
  const stepper = useStepper(0, STEPS.length)

  // 步骤 1：cleanup
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [cleanupSubmitting, setCleanupSubmitting] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<PoolCleanupResult | null>(null)

  // 步骤 2：audit-sample 批次
  const [batch, setBatch] = useState<PoolAuditSampleItem[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchIdx, setBatchIdx] = useState(0)

  // 步骤 3：audit-result 当前条
  const [submitting, setSubmitting] = useState(false)
  const [scoreInput, setScoreInput] = useState('4')
  const [lastResult, setLastResult] = useState<PoolAuditResult | null>(null)

  // 当前条目的旧均值（来自 batch item.score_avg），用于对比
  const currentItem = batch[batchIdx]

  /** 进入步骤 2 → 拉一批 */
  const loadBatch = async () => {
    setBatchLoading(true)
    setBatchIdx(0)
    setLastResult(null)
    try {
      const resp = await getAuditSample(10)
      setBatch(resp.items)
      if (resp.items.length === 0) {
        toast('当前没有可抽查的样本', 'info')
      }
    } catch (err) {
      // 拦截器已 toast
      console.warn('[CP-NEW.2] audit-sample failed:', err)
    } finally {
      setBatchLoading(false)
    }
  }

  useEffect(() => {
    if (stepper.active === 1 && batch.length === 0 && !batchLoading) {
      void loadBatch()
    }
    // 进入步骤 3 但当前条未提交时,自动用当前条初始分数
    if (stepper.active === 2 && currentItem && scoreInput === '') {
      setScoreInput(String(currentItem.score_avg.toFixed(1)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepper.active])

  /** 步骤 1 提交清理 */
  const handleCleanup = async (reason: string) => {
    setCleanupSubmitting(true)
    try {
      const result = await cleanupPool(reason)
      setCleanupResult(result)
      toast(`清理完成（${result.total} 条）`, 'success')
      setCleanupOpen(false)
      stepper.next()
    } catch {
      // 拦截器已 toast
    } finally {
      setCleanupSubmitting(false)
    }
  }

  /** 跳过清理直接进入抽查 */
  const skipCleanup = () => {
    setCleanupResult({ stale: 0, low_quality: 0, duplicates: 0, total: 0 })
    stepper.next()
  }

  /** 步骤 3 提交评分 */
  const submitScore = async () => {
    if (!currentItem) return
    const score = Number(scoreInput)
    if (Number.isNaN(score) || score < 0 || score > 10) {
      toast('评分需在 0-10 之间', 'error')
      return
    }
    setSubmitting(true)
    try {
      const result = await postAuditResult(currentItem.id, score)
      setLastResult(result)
      toast('评分已提交', 'success')
      // 自动跳到下一条
      const nextIdx = batchIdx + 1
      if (nextIdx < batch.length) {
        setBatchIdx(nextIdx)
        setScoreInput(String(batch[nextIdx].score_avg.toFixed(1)))
        stepper.goto(1) // 回步骤 2 看下一条
      } else {
        toast('本批完成，可拉下一批', 'info')
        stepper.goto(1)
        void loadBatch()
      }
    } catch {
      // 拦截器已 toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <Stepper steps={STEPS as unknown as Array<{ key: string; label: string }>} activeIndex={stepper.active} />

      {/* 步骤 1：cleanup */}
      {stepper.active === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
          <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
            步骤 1 · 清理陈旧 / 低分 / 重复条目
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            按 health_score 报告手动触发清理，幂等。reason 写入审计日志（≥5 字符）。
          </p>
          {cleanupResult && cleanupResult.total > 0 && (
            <div className="mt-3 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
              上次清理：陈旧 {cleanupResult.stale} · 低分 {cleanupResult.low_quality} · 重复 {cleanupResult.duplicates} · 合计 {cleanupResult.total}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button type="button" className={buttonPrimaryClass} onClick={() => setCleanupOpen(true)}>
              触发清理
            </button>
            <button type="button" className={buttonGhostClass} onClick={skipCleanup}>
              跳过清理
            </button>
          </div>
        </div>
      )}

      {/* 步骤 2：audit-sample */}
      {stepper.active === 1 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
              步骤 2 · 抽查样本
            </h2>
            <div className="text-xs text-neutral-400 dark:text-neutral-500">
              {batchLoading
                ? '加载中…'
                : batch.length === 0
                  ? '当前无样本'
                  : `${batchIdx + 1} / ${batch.length}`}
            </div>
          </div>

          {batchLoading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : batch.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-3">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                本批已完成或没有新样本。
              </p>
              <button type="button" className={buttonPrimaryClass} onClick={() => void loadBatch()}>
                重新拉一批
              </button>
            </div>
          ) : currentItem ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Badge value={currentItem.kind} />
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  id={currentItem.id}
                </span>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
                {currentItem.rewrite_text}
              </div>
              <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                <span>旧均值：{currentItem.score_avg.toFixed(2)}</span>
                <span>使用次数：{currentItem.usage_count}</span>
              </div>
              <div className="flex justify-end">
                <button type="button" className={buttonPrimaryClass} onClick={() => stepper.next()}>
                  开始打分
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 步骤 3：audit-result */}
      {stepper.active === 2 && currentItem && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
              步骤 3 · 提交评分
            </h2>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              {batchIdx + 1} / {batch.length}
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            audit_score 域 [0,10]（与 score_avg 对齐）。回写算法：
            <code className="mx-1 rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-700">
              new_avg = (old*usage_count + audit) / (usage_count+1)
            </code>
          </p>

          {lastResult && (
            <div className="mt-3 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
              已提交：{lastResult.example_id} → audit_score {lastResult.audit_score.toFixed(1)}
            </div>
          )}

          <div className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="audit-score"
                className="block text-sm font-medium text-neutral-600 dark:text-neutral-300"
              >
                评分（0-10）
              </label>
              <input
                id="audit-score"
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-ink focus:border-warm-ochre focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-ochre/30 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <button
              type="button"
              className={buttonPrimaryClass}
              onClick={() => void submitScore()}
              disabled={submitting}
            >
              {submitting ? '提交中…' : '提交'}
            </button>
            <button type="button" className={buttonGhostClass} onClick={() => stepper.prev()}>
              返回
            </button>
          </div>
        </div>
      )}

      <ReasonDialog
        open={cleanupOpen}
        title="触发池清理"
        description="清理陈旧 / 低分 / 重复条目（幂等操作）。reason 写入 admin_operation_logs。"
        confirmLabel="执行清理"
        confirmTone="danger"
        submitting={cleanupSubmitting}
        onClose={() => setCleanupOpen(false)}
        onConfirm={handleCleanup}
      />
    </div>
  )
}