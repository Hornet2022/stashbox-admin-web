import { getAudioVariantsStats } from '../api/admin/audio-variants'
import { useApi } from '../hooks/useApi'
import { ErrorNotice, MetricCard, Skeleton, buttonGhostClass, cellMutedClass, cellStrongClass, cellTextClass, footerCountClass, pageHintClass, pageTitleClass, rowClass, tableWrapClass, thClass, theadClass } from '../components/ui'
import { formatNumber } from '../utils'
import type { AudioVariantBitrateStat } from '../types'

/**
 * 多码率统计 —— A5 /admin/audio-variants/stats（接口文档 §2.2）。
 *
 * 用于 CP7.4 预加载调优：coverage_ratio = covered_articles / done_articles。
 *
 * CP-NEW.5 完整实现。
 */

export function AudioVariants() {
  const state = useApi(getAudioVariantsStats, 'audio-variants')

  return (
    <div>
      <h1 className={pageTitleClass}>多码率统计</h1>
      <p className={pageHintClass}>
        同一篇文章生成的多码率音频及其命中情况
      </p>

      {state.error && (
        <ErrorNotice message={state.error} missing={state.missing} onRetry={state.reload} />
      )}

      {state.loading && !state.data ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : state.data ? (
        <div className="mt-6 space-y-6">
          {/* 顶部指标卡 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label="覆盖率（covered / done）"
              metrics={[
                {
                  key: 'coverage_ratio',
                  label: '覆盖率',
                  value: state.data.coverage_ratio * 100,
                  unit: '%',
                  tone:
                    state.data.coverage_ratio >= 0.6
                      ? ('success' as const)
                      : state.data.coverage_ratio >= 0.3
                        ? ('warning' as const)
                        : ('error' as const),
                },
              ]}
            />
            <MetricCard
              label="覆盖文章数"
              metrics={[
                { key: 'covered', label: 'covered', value: state.data.covered_articles, unit: '篇' },
                { key: 'done', label: 'done 总数', value: state.data.done_articles, unit: '篇' },
              ]}
            />
            <MetricCard
              label="码率分布"
              metrics={[
                {
                  key: 'kinds',
                  label: '码率档数',
                  value: state.data.by_bitrate.length,
                  unit: '种',
                },
              ]}
            />
          </div>

          {/* by_bitrate 表 */}
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
                按码率聚合
              </h2>
              <button
                type="button"
                className={buttonGhostClass}
                onClick={state.reload}
              >
                刷新
              </button>
            </div>

            <div className={tableWrapClass}>
                            {/* w-full 不带 min-w-max 时表格会被压进容器宽度里挤列：375px 下 7 列平均每列 49px，
          中文单元格会被挤成一两个字一行 —— 就是本仓库 f102934 修过的那个竖排。
          带 min-w-max 才是「保持自然宽度 + 横向滚动」，降级方式才对。
          仓库里已有 5 张表是这个写法，这里补齐。 */}
              <table className="w-full min-w-max text-sm">
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>bitrate (kbps)</th>
                    <th className={thClass}>count</th>
                    <th className={thClass}>avg_file_size</th>
                    <th className={thClass}>avg_duration</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.by_bitrate.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-neutral-400 dark:text-neutral-500">
                        暂无变体数据
                      </td>
                    </tr>
                  ) : (
                    state.data.by_bitrate.map((b) => <BitrateRow key={b.bitrate} stat={b} />)
                  )}
                </tbody>
              </table>
            </div>

            <p className={footerCountClass}>
              注：64/96/128 kbps 三档是 CP7.3.0 变体服务的目标档位；监控覆盖率用于 CP7.4 预加载调优。
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function BitrateRow({ stat }: { stat: AudioVariantBitrateStat }) {
  return (
    <tr className={rowClass}>
      <td className={cellStrongClass}>{stat.bitrate}</td>
      <td className={cellTextClass}>{formatNumber(stat.count)}</td>
      <td className={cellTextClass}>
        {(stat.avg_file_size_bytes / 1024).toFixed(1)} KB
      </td>
      <td className={cellMutedClass}>{stat.avg_duration_sec.toFixed(1)} s</td>
    </tr>
  )
}

export default AudioVariants