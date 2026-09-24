import { Badge, Skeleton } from '../../components/ui'
import { formatTime } from '../../utils'
import type { TtsConfig } from '../../types'

/**
 * TTS 当前配置卡片（只读）—— 上半部分。
 *
 * 展示当前 provider、voice、API key 状态、来源、上次更新时间。
 */
export function CurrentConfigCard({
  data,
  loading,
}: {
  data: TtsConfig | null
  loading: boolean
}) {
  const apiKeyStatus = data?.api_key_set
    ? `已设置（末 4 位 ${data.api_key_last4 ?? '????'}）`
    : '未设置'

  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
      <header className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-700/60">
        <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
          当前配置
        </h2>
      </header>
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : (
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[8rem_1fr]">
            <dt className="text-sm text-neutral-400 dark:text-neutral-500">Provider</dt>
            <dd className="text-sm font-medium text-ink dark:text-neutral-100">
              {data ? <Badge value={data.provider} /> : '—'}
            </dd>

            <dt className="text-sm text-neutral-400 dark:text-neutral-500">Voice</dt>
            <dd className="text-sm text-neutral-600 dark:text-neutral-300">
              {data ? (
                (data.provider === 'edge' && data.edge_voice) ||
                (data.provider === 'openai' && data.openai_voice) ||
                (data.provider === 'doubao' && data.doubao_voice) ||
                (data.provider === 'local' && data.local_voice) ||
                (data.provider === 'indextts' &&
                  data.indextts_ref_audio?.split('/').pop()) ||
                '—'
              ) : (
                '—'
              )}
            </dd>

            <dt className="text-sm text-neutral-400 dark:text-neutral-500">API key</dt>
            <dd className="text-sm text-neutral-600 dark:text-neutral-300">
              {data ? apiKeyStatus : '—'}
            </dd>

            {data?.provider === 'local' && (
              <>
                <dt className="text-sm text-neutral-400 dark:text-neutral-500">ffmpeg</dt>
                <dd className="text-sm text-neutral-600 dark:text-neutral-300">
                  {data.ffmpeg_bin || '—'}
                </dd>
              </>
            )}

            {data?.provider === 'doubao' && data.doubao_resource_id && (
              <>
                <dt className="text-sm text-neutral-400 dark:text-neutral-500">Resource ID</dt>
                <dd className="text-sm text-neutral-600 dark:text-neutral-300">
                  {data.doubao_resource_id}
                </dd>
              </>
            )}

            <dt className="text-sm text-neutral-400 dark:text-neutral-500">上次更新</dt>
            <dd className="text-sm text-neutral-600 dark:text-neutral-300">
              {data?.updated_at ? formatTime(data.updated_at) : '—'}
            </dd>

            <dt className="text-sm text-neutral-400 dark:text-neutral-500">来源</dt>
            <dd className="text-sm text-neutral-600 dark:text-neutral-300">
              {data?.source ? <Badge value={data.source} /> : '—'}
            </dd>
          </dl>
        )}
      </div>
    </section>
  )
}