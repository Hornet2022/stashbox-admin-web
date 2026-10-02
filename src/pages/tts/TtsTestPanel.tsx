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
const TTS_ERROR_KIND_TONE: Record<string, { badge: string; banner: string; label: string }> = {
  auth: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200', banner: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/20 dark:text-rose-100 dark:border-rose-800', label: '鉴权失败' },
  forbidden: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200', banner: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/20 dark:text-rose-100 dark:border-rose-800', label: '权限受限' },
  notfound: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200', banner: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/20 dark:text-rose-100 dark:border-rose-800', label: '资源不存在' },
  badreq: { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200', banner: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-900/20 dark:text-rose-100 dark:border-rose-800', label: '参数错误' },
  ratelimit: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', banner: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800', label: '触发限流' },
  timeout: { badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', banner: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-900/20 dark:text-sky-100 dark:border-sky-800', label: '调用超时' },
  connect: { badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', banner: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-900/20 dark:text-sky-100 dark:border-sky-800', label: '无法连接' },
  network: { badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', banner: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-900/20 dark:text-sky-100 dark:border-sky-800', label: '网络异常' },
  empty: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', banner: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800', label: '空音频' },
  missing_dep: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', banner: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800', label: '缺依赖包' },
  subprocess: { badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', banner: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-900/20 dark:text-sky-100 dark:border-sky-800', label: '子进程失败' },
  business_code: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', banner: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800', label: '业务错误码' },
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

      <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700">
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