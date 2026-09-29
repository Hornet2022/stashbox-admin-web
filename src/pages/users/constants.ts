/** 用户管理列头 */
export const COLUMNS = [
  'ID',
  '邮箱',
  '昵称',
  '角色',
  '等级',
  '状态',
  '月配额',
  '已用',
  '注册时间',
  '操作',
] as const

/**
 * 等级（users.tier）过滤。
 *
 * CP-USERS-REALITY：原来是 `['', 'free', 'pro', 'max']`，但系统里**从来没有
 * pro / max 这两个值** —— users.tier 实际只出现 free / admin / operator
 * （`backend/common/auth_admin.py` 的 ADMIN_TIERS = {"admin", "operator"}）。
 * 管理员选「pro」必然搜出 0 条，还以为是自己数据出了问题。
 * 改成系统真实存在的取值。
 */
export const TIERS = ['', 'free', 'admin', 'operator'] as const

/**
 * 状态过滤。
 *
 * CP-USERS-REALITY：后端原来收了 status 参数却不加任何 where，选什么都是全量。
 * 现在后端按 deleted_at 真正过滤（active = 未删，deleted = 已删）。
 * **suspended 已从下拉移除** —— users 表没有冻结列，加进去就是个永远
 * 返回 0 条的假选项；要支持冻结得先加列，不能靠下拉框许诺。
 */
export const STATUSES = ['', 'active', 'deleted'] as const
