import { useAuthStore } from '../store/auth'
import type { AdminRole } from '../types'

/** 读 auth store 的 role 返回 AdminRole | null */
export function useRole(): AdminRole | null {
  const role = useAuthStore((s) => s.role)
  return (role as AdminRole | null) ?? null
}

/** 权限判定：角色 required 列表中是否含当前角色。
 *
 * 契约：'admin' 角色视为可访问 'super_admin' 资源（向上升级兼容）。
 */
export function hasPermission(role: AdminRole | null, required: AdminRole[]): boolean {
  if (!role) return false
  if (role === 'admin') return required.includes('super_admin')
  return required.includes(role)
}

/** CP-NEW.17：评测员级别权限（super_admin / operator 可调）。
 *
 * 用途：
 * - Evaluations 页的 AnnotateDialog（标注提交）
 * - TtsBlindTest 页的 submit 评分（盲测打分）
 *
 * 与"页面可见性"解耦：sidebar 已对 operator 全开放，但写动作权限用此 hook 单独判断。
 */
export function useCanAnnotate(): boolean {
  const role = useRole()
  return hasPermission(role, ['super_admin', 'operator'])
}

/** CP-NEW.17：写权限（super_admin 级别：重试 / 删除 / 调整配额 / 清理 / PUT 配置等危险动作）。 */
export function useCanWrite(): boolean {
  const role = useRole()
  // admin 角色升级兼容 super_admin
  return hasPermission(role, ['super_admin'])
}
