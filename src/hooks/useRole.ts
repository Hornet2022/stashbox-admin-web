import { useAuthStore } from '../store/auth'
import type { AdminRole } from '../types'

/** 读 auth store 的 role 返回 AdminRole | null */
export function useRole(): AdminRole | null {
  const role = useAuthStore((s) => s.role)
  return (role as AdminRole | null) ?? null
}

/** 权限判定：当前角色是否在允许的角色集合里。
 *
 * ## 为什么没有「等级」概念
 *
 * 后端真实只有**两档**角色（`common/auth_admin.py::ADMIN_TIERS = {admin, operator}`），
 * 而且**两者权限完全相同** —— 所有 admin 端点用的是
 * `require_admin_or_operator`，没有哪一档比另一档更强。
 *
 * 原来这里写的是四档（`admin` / `super_admin` / `operator` / `viewer`），
 * 还带一条「admin 向上升级成 super_admin」的特例。那套阶梯是**虚构的**：
 * `super_admin` / `viewer` 后端根本不存在，`require_admin`（严格 admin）
 * 定义了但**全仓零路由使用**。
 *
 * 后果不是"判错了"（恰好都放行），而是**判据的形状和后端对不上**：
 * 读代码的人以为 admin 比 operator 权限大，实际两者一模一样；
 * 将来后端真的用上 `require_admin` 时，前端会毫无预警地放行。
 *
 * 所以前端只保留后端真实存在的两档，判据也只按后端的实际语义写。
 * 将来要分 admin-only 端点时：**先在后端真的用上 `require_admin`**，
 * 再在这里加一档 —— 顺序反了就会出现「前端以为拦住了、后端其实没拦」。
 */
export function hasPermission(role: AdminRole | null, allowed: AdminRole[]): boolean {
  if (!role) return false
  return allowed.includes(role)
}

/** 后端 `require_admin_or_operator` 的前端对应：两档都能写。
 *
 * ⚠️ 与后端 `require_admin_or_operator` 一一对应 ——
 * admin 和 operator **同权**，没有"只有 admin 才能写"这回事。
 *
 * 写成**共享常量**而不是再包一个 `canOperate()` 函数：
 * 页面上几乎都已经有一个叫 `canOperate` 的局部布尔变量，
 * 再导出一个同名函数会直接撞名（`const canOperate = canOperate(role)`）。
 * 单一判定原语（`hasPermission`）+ 共享角色集，歧义最少。
 */
export const STAFF_ROLES: AdminRole[] = ['admin', 'operator']

/** CP-NEW.17：评测员级别权限。
 *
 * 用途：
 * - Evaluations 页的 AnnotateDialog（标注提交）
 * - TtsBlindTest 页的 submit 评分（盲测打分）
 *
 * 与"页面可见性"解耦：sidebar 已对 operator 全开放，但写动作权限用此 hook 单独判断。
 *
 * 口径与 `canOperate` 相同（后端这两个动作也是 require_admin_or_operator），
 * 单独留一个名字是为了**读代码时能看出这个动作的归属**。
 */
export function useCanAnnotate(): boolean {
  const role = useRole()
  return hasPermission(role, STAFF_ROLES)
}
