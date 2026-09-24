import { pageHintClass, pageTitleClass } from '../components/ui'

/**
 * 模型路由 —— A1 tier-config（接口文档 §2.2，含 D2 接线）。
 *
 * 关键交互：PUT 成功后必须 GET 回读 source=='db' 确认生效；
 * warnings 非空时 UI 必须给黄色提示条（防止运营配未实现 client 的 provider）。
 *
 * 本文件是 stub，CP-NEW.4 承接完整实现。
 */
export function ModelRouting() {
  return (
    <div>
      <h1 className={pageTitleClass}>模型路由</h1>
      <p className={pageHintClass}>
        数据源：GET /api/v1/admin/tier-config · PUT /api/v1/admin/tier-config（热生效，Redis 5s 缓存 + 写后失效）
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
        tier_model_map 左右双栏（默认 vs 生效）+ warnings 黄条 + PUT 回读确认 骨架，CP-NEW.4 承接
      </div>
    </div>
  )
}

export default ModelRouting