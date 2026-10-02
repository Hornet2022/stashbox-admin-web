import { useEffect, useState } from 'react'
import { Eye, EyeOff, Volume2 } from 'lucide-react'
import {
  createBlindTest,
  getBlindTestResults,
  submitBlindTest,
} from '../api/admin/tts-blind-test'
import { useStepper } from '../hooks/useStepper'
import { useCanAnnotate } from '../hooks/useRole'
import { toast } from '../store/toast'
import { CaveatBanner, Stepper, buttonGhostClass, buttonPrimaryClass, cellTextClass, inputClass, pageHintClass, pageTitleClass } from '../components/ui'
import type { BlindTestResults, BlindTestSetup } from '../types'

/**
 * TTS 盲测 —— A8 /admin/tts/blind-test（接口文档 §2.2）。
 *
 * 3 步 stepper：
 *   ① 发起（setup）：text 1-500 字符 + providers 2-6 个（逗号分隔）
 *   ② 打分（submit）：逐条 1-5 分，全部打分完才能提交（evaluator_id 覆盖式更新）
 *   ③ 揭晓（results）：评测完成后展示 revealed_mapping（仅当 evaluator_count ≥ 上限目标）
 *
 * 2026-10-02 起后端走**真合成**（每 provider 调 build_client，音频落
 * /tmp/audio/blind-test/ 由网关 /audio 挂载），所以这里不再标"模拟数据"。
 * 继续挂着那个标会让评测员以为听到的是假的，从而不信任本来有效的结论。
 * ⚠️ provider 顺序已随机隐藏，盲测有效性依赖这一点，前端不要展示 mapping（步骤 3 之前）。
 * ⚠️ 盲测会话存 ai-service 进程内存（24h TTL）：单 worker 可用；重启/多 worker 会丢。
 *
 * CP-NEW.4 完整实现。
 */

const STEPS = [
  { key: 'setup', label: '发起' },
  { key: 'score', label: '打分' },
  { key: 'reveal', label: '揭晓' },
] as const

const STORAGE_KEY = 'stashbox_blind_test_state'

interface PersistedState {
  blindTestId: string
  evaluatorId: string
  /** 提交过的样本 key → score,用于步骤 3 揭晓时复用 */
  scores: Record<string, number>
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

function savePersisted(s: PersistedState | null) {
  if (s) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  else sessionStorage.removeItem(STORAGE_KEY)
}

export function TtsBlindTest() {
  const persisted = loadPersisted()
  // 始终从步骤 1（发起）开始，不按 persisted 跳到打分步。
  //
  // 原来 `useStepper(persisted ? 1 : 0, ...)`：刷新后停在步骤 2，但打分区的渲染条件是
  // `stepper.active === 1 && setupData && (...)`，而 setupData 只在本次挂载里由
  // handleSetup 赋值、**从不从 persisted 恢复**（后端也没有 setup 查询端点可回查）。
  // 结果是：页面只剩标题和 Stepper，「返回 / 重置 / 提交评分」三个按钮全在
  // setupData 块里一个都渲染不出来 —— 死胡同，只能手抄 sessionStorage 清。
  // 音频 URL 无法凭空恢复，所以诚实的做法是说明情况 + 给一条出路，而不是渲染空白。
  const stepper = useStepper(0, STEPS.length)

  // CP-NEW.17：operator + super_admin 可打分；admin/viewer 只读
  const canAnnotate = useCanAnnotate()

  // 步骤 1：发起
  const [text, setText] = useState('')
  const [providersInput, setProvidersInput] = useState('doubao, indextts')
  const [setupData, setSetupData] = useState<BlindTestSetup | null>(null)
  const [setupSubmitting, setSetupSubmitting] = useState(false)

  // 步骤 2：打分
  const [evaluatorId, setEvaluatorId] = useState(persisted?.evaluatorId ?? '')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)

  // 步骤 3：揭晓
  const [results, setResults] = useState<BlindTestResults | null>(null)
  const [revealLoading, setRevealLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)

  // 持久化
  useEffect(() => {
    if (setupData) {
      savePersisted({
        blindTestId: setupData.blind_test_id,
        evaluatorId,
        scores,
      })
    }
  }, [setupData, evaluatorId, scores])

  const handleSetup = async () => {
    const trimmedText = text.trim()
    if (trimmedText.length < 1 || trimmedText.length > 500) {
      toast('文本需在 1-500 字符之间', 'error')
      return
    }
    const providers = providersInput
      .split(/[,，\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (providers.length < 2 || providers.length > 6) {
      toast('providers 需 2-6 个（逗号/空格分隔）', 'error')
      return
    }
    setSetupSubmitting(true)
    try {
      const result = await createBlindTest({ text: trimmedText, providers })
      setSetupData(result)
      // 用后端给的 id 持久化
      savePersisted({
        blindTestId: result.blind_test_id,
        evaluatorId,
        scores: {},
      })
      setScores({})
      setResults(null)
      setRevealed(false)
      stepper.next()
    } catch {
      // 拦截器已 toast
    } finally {
      setSetupSubmitting(false)
    }
  }

  const allScored = setupData
    ? setupData.samples.every((s) => typeof scores[s.key] === 'number')
    : false

  const handleSubmitScores = async () => {
    if (!setupData || !evaluatorId.trim()) {
      toast('evaluator_id 必填（覆盖式更新，同 id 后写覆盖前写）', 'error')
      return
    }
    setSubmitting(true)
    try {
      await submitBlindTest(setupData.blind_test_id, {
        evaluator_id: evaluatorId.trim(),
        scores: setupData.samples.map((s) => ({
          sample_key: s.key,
          score: scores[s.key],
        })),
      })
      toast('评分已提交', 'success')
      stepper.next()
    } catch {
      // 拦截器已 toast
    } finally {
      setSubmitting(false)
    }
  }

  const handleReveal = async () => {
    if (!setupData) return
    setRevealLoading(true)
    try {
      const result = await getBlindTestResults(setupData.blind_test_id)
      setResults(result)
      setRevealed(true)
    } catch {
      // 拦截器已 toast
    } finally {
      setRevealLoading(false)
    }
  }

  const resetAll = () => {
    setSetupData(null)
    setScores({})
    setResults(null)
    setRevealed(false)
    setText('')
    savePersisted(null)
    stepper.goto(0)
  }

  return (
    <div>
      <h1 className={pageTitleClass}>TTS 盲测</h1>
      <p className={pageHintClass}>
        数据源：POST /api/v1/admin/tts/blind-test · /submit · /results
      </p>

      <CaveatBanner
        variant="warning"
        title="盲测须知"
        items={[
          '音频为真实合成，但合成耗时长（本机 TTS 约 20 秒起），请等样本生成完再开始打分',
          '某个 provider 合成失败时会被列在 failed_providers 里 —— 该 provider 不参与本次比较',
          'provider 顺序已随机隐藏，盲测有效性依赖这一点 —— 步骤 3 之前不要在 UI 中尝试反推',
        ]}
      />

      <div className="mt-5">
        <Stepper steps={STEPS as unknown as Array<{ key: string; label: string }>} activeIndex={stepper.active} />
      </div>

      {/* 未完成会话的恢复提示。
          原来刷新后 stepper 直接跳到步骤 2、而 setupData 恒为 null，
          「返回 / 重置 / 提交评分」又都锁在 setupData 块内部 → 整页只剩标题的死胡同，
          只能手抄 sessionStorage 才能脱困。音频 URL 服务端存 24h 且没有查询端点，
          没法真的恢复，所以明说 + 给一条出路。 */}
      {persisted && !setupData && (
        <CaveatBanner
          variant="warning"
          title="检测到一次未完成的盲测会话"
          items={[
            `blind_test_id ${persisted.blindTestId}${
              Object.keys(persisted.scores ?? {}).length > 0
                ? `，已打 ${Object.keys(persisted.scores).length} 个分`
                : ''
            }`,
            '音频链接无法恢复（盲测会话存后端进程内存 24h，且没有查询 setup 的接口），需要重新发起一次。',
          ]}
        />
      )}

      {/* 步骤 1：发起 */}
      {stepper.active === 0 && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
          <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
            步骤 1 · 发起盲测
          </h2>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                文本（1-500 字符）
              </span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="例如：开场三十秒抓住通勤的你。"
                className={`${inputClass} mt-1 resize-none`}
              />
              <div className="mt-1 text-right text-xs text-neutral-400 dark:text-neutral-500">
                {text.length} / 500
              </div>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                providers（2-6 个，逗号或空格分隔）
              </span>
              <input
                type="text"
                value={providersInput}
                onChange={(e) => setProvidersInput(e.target.value)}
                placeholder="doubao, indextts, openai"
                className={`${inputClass} mt-1 font-mono text-xs`}
              />
              <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                实际下发顺序后端会随机洗牌
              </div>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                evaluator_id（评测员标识，sessionStorage 暂存）
              </span>
              <input
                type="text"
                value={evaluatorId}
                onChange={(e) => setEvaluatorId(e.target.value)}
                placeholder="eva-wang"
                className={`${inputClass} mt-1 font-mono text-xs`}
              />
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between gap-2">
            {persisted && !setupData && (
              <button type="button" className={buttonGhostClass} onClick={resetAll}>
                清空未完成的会话
              </button>
            )}
            <div className="ml-auto flex items-center justify-end gap-2">
              <button
                type="button"
                className={buttonPrimaryClass}
                onClick={handleSetup}
                disabled={setupSubmitting}
              >
                {setupSubmitting ? '发起中…' : '发起盲测'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 步骤 2：打分 */}
      {stepper.active === 1 && setupData && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
                步骤 2 · 打分
              </h2>
              <div className="text-xs text-neutral-400 dark:text-neutral-500">
                blind_test_id: <span className="font-mono">{setupData.blind_test_id}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              provider 匿名（sample_1 / sample_2 ...）。全部打分后才能提交。
            </p>

            <div className="mt-4 space-y-3">
              {setupData.samples.map((sample) => (
                <SampleRow
                  key={sample.key}
                  sampleKey={sample.key}
                  audioUrl={sample.audio_url}
                  score={scores[sample.key]}
                  onScore={(s) => setScores((prev) => ({ ...prev, [sample.key]: s }))}
                  canScore={canAnnotate}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="button" className={buttonGhostClass} onClick={resetAll}>
              重置（清空当前会话）
            </button>
            <button type="button" className={buttonGhostClass} onClick={() => stepper.prev()}>
              返回
            </button>
            <button
              type="button"
              className={buttonPrimaryClass}
              onClick={handleSubmitScores}
              disabled={!allScored || submitting || !canAnnotate}
              title={canAnnotate ? '提交评测员盲测打分' : '权限不足：仅 super_admin / operator 可打分'}
            >
              {submitting ? '提交中…' : '提交评分'}
            </button>
          </div>
        </div>
      )}

      {/* 步骤 3：揭晓 */}
      {stepper.active === 2 && setupData && (
        <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/50">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
              步骤 3 · 揭晓
            </h2>
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
              {revealed ? '已揭晓' : '未揭晓'}
            </div>
          </div>

          {!revealed ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                揭晓后才会暴露 sample_1 / sample_2 ... 实际对应的 provider。
                评测完成前请勿揭晓，避免破盲。
              </p>
              <div className="flex items-center justify-end gap-2">
                <button type="button" className={buttonGhostClass} onClick={() => stepper.prev()}>
                  返回打分
                </button>
                <button
                  type="button"
                  className={buttonPrimaryClass}
                  onClick={handleReveal}
                  disabled={revealLoading}
                >
                  {revealLoading ? '揭晓中…' : '揭晓 mapping'}
                </button>
              </div>
            </div>
          ) : results ? (
            <RevealView results={results} onReset={resetAll} />
          ) : null}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   单条样本
───────────────────────────────────────────────────────── */

function SampleRow({
  sampleKey,
  audioUrl,
  score,
  onScore,
  canScore,
}: {
  sampleKey: string
  audioUrl: string
  score?: number
  onScore: (s: number) => void
  canScore: boolean
}) {
  const [audioError, setAudioError] = useState(false)

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900/40">
      <div className="flex items-center gap-3">
        <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
          {sampleKey}
        </span>

        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <Volume2 size={14} />
          {audioError ? (
            <span className="text-warning">该样本无法播放（合成可能失败或文件已被清理）</span>
          ) : (
            <audio
              controls
              src={audioUrl}
              onError={() => setAudioError(true)}
              className="h-8 max-w-[260px]"
            />
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 text-sm">
          <span className="text-xs text-neutral-400 dark:text-neutral-500">分</span>
          <input
            type="number"
            min={1}
            max={5}
            step={0.5}
            value={score ?? ''}
            disabled={!canScore}
            title={canScore ? '1-5 分' : '权限不足：仅 super_admin / operator 可打分'}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v) && v >= 1 && v <= 5) onScore(v)
              else if (e.target.value === '') onScore(NaN as unknown as number)
            }}
            placeholder="1-5"
            className={`${inputClass} w-16 py-1 text-xs`}
          />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   揭晓视图
───────────────────────────────────────────────────────── */

function RevealView({
  results,
  onReset,
}: {
  results: BlindTestResults
  onReset: () => void
}) {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          provider 中位分（evaluator_count={results.evaluator_count}）
        </h3>
        <div className="mt-2 space-y-1">
          {Object.entries(results.provider_median).map(([provider, median]) => (
            <div
              key={provider}
              className="flex items-baseline justify-between rounded border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900/40"
            >
              <span className="font-mono text-xs">{provider}</span>
              <span className="font-serif text-lg font-semibold text-warm-ochre">
                {median.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          sample → provider 映射
        </h3>
        <div className="mt-2 space-y-1">
          {Object.entries(results.revealed_mapping).map(([sampleKey, provider]) => (
            <div
              key={sampleKey}
              className={cellTextClass + ' flex items-center justify-between rounded border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900/40'}
            >
              <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                {sampleKey}
              </span>
              <span className="text-neutral-700 dark:text-neutral-200">→ {provider}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button type="button" className={buttonGhostClass} onClick={onReset}>
          开始新盲测
        </button>
      </div>
    </div>
  )
}

export default TtsBlindTest