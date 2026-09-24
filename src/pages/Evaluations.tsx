import { pageHintClass, pageTitleClass } from '../components/ui'

/**
 * 评测标注 —— A3 评分查询 + 评测员标注 + 一致性（接口文档 §2.2）。
 *
 * 上线硬前提：alembic 0029（evaluator_id 列）。
 * 契约注意：list 响应不含 comment / evaluator_id；如要展示标注归属必须改后端契约。
 *
 * 本文件是 stub，CP-NEW.3 承接完整实现。
 */
export function Evaluations() {
  return (
    <div>
      <h1 className={pageTitleClass}>评测标注</h1>
      <p className={pageHintClass}>
        数据源：GET /api/v1/admin/evaluations · /evaluations/agreement · POST /evaluations/{'{id}'}/annotate
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
        一致性卡 + 评分列表 + 标注表单骨架，CP-NEW.3 承接
      </div>
    </div>
  )
}

export default Evaluations