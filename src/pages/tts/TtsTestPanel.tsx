import { AlertTriangle } from 'lucide-react'
import { Badge, cellMutedClass, cellStrongClass, cellTextClass, rowClass } from '../../components/ui'
import type { TtsTestResult } from '../../types'
import { RESULT_LABELS } from '../../constants/labels'

/**
 * TTS 测试调用结果面板 —— 表单提交成功后由父组件 setTestResult 触发显示。
 *
 * CP-TTS-TEST-ERR：失败时按 error_kind 渲染带颜色的 banner，给出可执行 hint；
 * 同时在表格里把"错误"行拆为"错误分类 / 状态码 / 原始异常"三行，方便排查。
 */

/**
 * TTS 错误分类 → 视觉色调（与 LLM 那套对齐；新增 4 个 TTS 专属 kind：
 * empty / missing_dep / subprocess / business_code）
 */
/* 2026-10-03：三类错误原本用 Tailwind 默认的 rose / amber / sky 三套冷色。
   一次「蓝天色 banner」出现在暖赭米白的后台里，是最直接的脚手架痕迹。
   这里收成品牌三语义：失败→error、限流/空音频/缺依赖→warning、
   超时/连不上/网络→neutral。区分信息本来就由 label 文字承担，
   而网络类本质是「没有结果」而不是「出错」，中性色比天蓝更诚实。 */
const TTS_ERROR_KIND_TONE: Record<string, { badge: string; banner: string; label: string }> = {
  auth: { badge: 'bg-error/10 text-error-ink', banner: 'border-error/30 bg-error/10 text-error-ink', label: '鉴权失败' },
  forbidden: { badge: 'bg-error/10 text-error-ink', banner: 'border-error/30 bg-error/10 text-error-ink', label: '权限受限' },
  notfound: { badge: 'bg-error/10 text-error-ink', banner: 'border-error/30 bg-error/10 text-error-ink', label: '资源不存在' },
  badreq: { badge: 'bg-error/10 text-error-ink', banner: 'border-error/30 bg-error/10 text-error-ink', label: '参数错误' },
  ratelimit: { badge: 'bg-warning/15 text-warning-ink', banner: 'border-warning/30 bg-warning/10 text-warning-ink', label: '触发限流' },
  timeout: { badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300', banner: 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600', label: '调用超时' },
  connect: { badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300', banner: 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600', label: '无法连接' },
  network: { badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300', banner: 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600', label: '网络异常' },
  empty: { badge: 'bg-warning/15 text-warning-ink', banner: 'border-warning/30 bg-warning/10 text-warning-ink', label: '空音频' },
  missing_dep: { badge: 'bg-warning/15 text-warning-ink', banner: 'border-warning/30 bg-warning/10 text-warning-ink', label: '缺依赖包' },
  subprocess: { badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300', banner: 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600', label: '子进程失败' },
  business_code: { badge: 'bg-warning/15 text-warning-ink', banner: 'border-warning/30 bg-warning/10 text-warning-ink', label: '业务错误码' },
  internal: { badge: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200', banner: 'bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700', label: '内部异常' },
}

/** 前端兜底文案见 ./ttsTestMessages —— 与本组件分开，避免破坏 Fast Refresh。 */

export function TtsTestPanel({ result }: { result: TtsTestResult | null }) {
  if (!result) return null

  const tone = TTS_ERROR_KIND_TONE[result.error_kind ?? ''] ?? TTS_ERROR_KIND_TONE.internal

  return (
    <div className="mt-6 space-y-3">
      {/* 失败时用醒目 banner 给出可执行引导（CP-TTS-TEST-ERR） */}
      {!result.ok && result.hint && (
        <div
          role="alert"
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${tone.banner}`}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <div className="font-medium">
              {tone.label}
              {result.status_code != null && (
                <span className="ml-2 text-xs opacity-80">HTTP {result.status_code}</span>
              )}
            </div>
            <div className="mt-0.5">{result.hint}</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto overscroll-x-contain rounded-md border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-left text-sm">
          <tbody>
            <tr className={rowClass}>
              <th className={`${cellMutedClass} font-normal`}>结果</th>
              <td className={cellStrongClass}>
                <Badge value={result.ok ? 'ok' : 'failed'} map={RESULT_LABELS} />
              </td>
            </tr>
            <tr className={rowClass}>
              <th className={`${cellMutedClass} font-normal`}>Provider</th>
              <td className={cellTextClass}>{result.provider}</td>
            </tr>
            <tr className={rowClass}>
              <th className={`${cellMutedClass} font-normal`}>Voice</th>
              <td className={cellTextClass}>{result.voice || '—'}</td>
            </tr>
            {result.ok ? (
              <tr className={rowClass}>
                <th className={`${cellMutedClass} font-normal`}>合成字节数</th>
                <td className={cellTextClass}>{result.bytes_len ?? 0} bytes</td>
              </tr>
            ) : (
              <>
                <tr className={rowClass}>
                  <th className={`${cellMutedClass} font-normal`}>错误分类</th>
                  <td className={cellTextClass}>
                    {result.error_kind ? (
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${tone.badge}`}
                      >
                        {tone.label}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
                <tr className={rowClass}>
                  <th className={`${cellMutedClass} font-normal`}>状态码</th>
                  <td className={cellTextClass}>
                    {result.status_code != null ? result.status_code : '—'}
                  </td>
                </tr>
                <tr className={rowClass}>
                  <th className={`${cellMutedClass} font-normal`}>原始异常</th>
                  <td className={`${cellTextClass} whitespace-pre-wrap break-all text-xs opacity-80`}>
                    {result.detail || result.error || '—'}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}