import { pageHintClass, pageTitleClass } from '../components/ui'

/**
 * GDPR 同意抽查 —— A7（接口文档 §2.2）。
 *
 * 隐私端点：仅回显结构化字段（user_id / 两开关 / version / 时间），无 comment 类自由文本。
 * UI 必须标「仅结构化字段,自由文本不展示」。
 *
 * 本文件是 stub，CP-NEW.5 承接完整实现。
 */
export function Consents() {
  return (
    <div>
      <h1 className={pageTitleClass}>GDPR 同意</h1>
      <p className={pageHintClass}>
        数据源：GET /api/v1/admin/consents（仅结构化字段，不回显 comment 类自由文本）
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
        表格 + 隐私红线提示 骨架，CP-NEW.5 承接
      </div>
    </div>
  )
}

export default Consents