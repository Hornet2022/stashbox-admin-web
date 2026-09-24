import { useState } from 'react'
import { SlidingTabs, pageHintClass, pageTitleClass } from '../components/ui'

/**
 * 听感池 —— A2 池列表 + A6 池抽查工作流 合成一页（CP-NEW.1 q3 拍板）。
 *
 * SlidingTabs 切换：
 *   - 「健康度 + 列表」：健康度卡 + few-shot 条目列表 + 过滤分页
 *   - 「清理 + 抽查」：cleanup 危险操作 + audit-sample 3 步工作流
 *
 * 本文件是 stub（CP-NEW.1 不实现业务），CP-NEW.2 承接完整实现。
 * 上线硬前提：alembic 0029 已执行（evaluator_id / ab_group 列）。
 */
type Tab = 'overview' | 'cleanup'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: '健康度 + 列表' },
  { key: 'cleanup', label: '清理 + 抽查' },
]

export function FewShotPool() {
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <div>
      <h1 className={pageTitleClass}>听感池</h1>
      <p className={pageHintClass}>
        数据源：GET /api/v1/admin/few-shot-pool/health · /few-shot-pool · /audit-sample · /cleanup · /audit-result
      </p>

      <div className="mt-5">
        <SlidingTabs items={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'overview' ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
          健康度卡 + 列表骨架，CP-NEW.2 承接
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
          清理 + 抽查工作流骨架，CP-NEW.2 承接
        </div>
      )}
    </div>
  )
}

export default FewShotPool