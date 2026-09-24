import { pageHintClass, pageTitleClass } from '../components/ui'

/**
 * 多码率统计 —— A5（接口文档 §2.2）。
 *
 * 用于 CP7.4 预加载调优：coverage_ratio = covered_articles / done_articles。
 *
 * 本文件是 stub，CP-NEW.5 承接完整实现。
 */
export function AudioVariants() {
  return (
    <div>
      <h1 className={pageTitleClass}>多码率统计</h1>
      <p className={pageHintClass}>
        数据源：GET /api/v1/admin/audio-variants/stats（按 bitrate GROUP BY + 覆盖率聚合）
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
        by_bitrate 表 + coverage_ratio 卡 + 趋势占位 骨架，CP-NEW.5 承接
      </div>
    </div>
  )
}

export default AudioVariants