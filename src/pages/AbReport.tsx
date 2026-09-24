import { pageHintClass, pageTitleClass } from '../components/ui'

/**
 * A/B 实验报表 —— A4（接口文档 §2.2）。
 *
 * ⚠️ 结论有效性硬约束：报表口径从 0029 部署日起算 —— UI caveats 必须展示。
 * ⚠️ groups.length < 2 时显示「数据积累中,距 0029 部署起需满 2 周」。
 *
 * 权限：全员可见（实验进展要让运营都知会），CaveatBanner 强提示两条 caveats。
 *
 * 本文件是 stub，CP-NEW.5 承接完整实现。
 */
export function AbReport() {
  return (
    <div>
      <h1 className={pageTitleClass}>A/B 报表</h1>
      <p className={pageHintClass}>
        {'数据源：GET /api/v1/admin/ab-report（按 user_id%100<30 ITT 分组，0029 上线前数据归 pre_experiment）'}
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
        caveats 红色 banner + 三组四指标卡 + 数据积累中态 骨架，CP-NEW.5 承接
      </div>
    </div>
  )
}

export default AbReport