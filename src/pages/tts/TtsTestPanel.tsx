import { Badge, cellMutedClass, cellStrongClass, cellTextClass, rowClass } from '../../components/ui'
import type { TtsTestResult } from '../../types'

/**
 * TTS 测试调用结果面板 —— 表单提交成功后由父组件 setTestResult 触发显示。
 */
export function TtsTestPanel({ result }: { result: TtsTestResult | null }) {
  if (!result) return null

  return (
    <div className="mt-6 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700">
      <table className="w-full text-left text-sm">
        <tbody>
          <tr className={rowClass}>
            <th className={`${cellMutedClass} font-normal`}>结果</th>
            <td className={cellStrongClass}>
              <Badge value={result.ok ? 'ok' : 'failed'} />
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
          <tr className={rowClass}>
            <th className={`${cellMutedClass} font-normal`}>
              {result.ok ? '合成字节数' : '错误'}
            </th>
            <td className={`${cellTextClass} whitespace-pre-wrap break-all`}>
              {result.ok ? `${result.bytes_len ?? 0} bytes` : result.error}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}