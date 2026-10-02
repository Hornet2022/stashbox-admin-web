/** 用户管理列头
 *
 * 去掉了「角色」列。它不是独立字段 —— 后端 `user-service/main.py:873` 是
 * `role = tier if tier in {admin, operator} else "user"` 算出来的：
 *   - 26/27 行恒为 `user`，整列是一个常量
 *   - 唯一那行 admin 会和右边「等级」列显示同一个值
 * 等于把一个函数的输出和它的输入并排放着，零信息量。
 *
 * 「邮箱」和「昵称」合成一列：邮箱 27 个用户里只有 2 个有值，单列开一整栏
 * 92% 是破折号。两行放一起反而更像「这是谁」——昵称为主、邮箱为辅，
 * 有邮箱的人自然多出一行，没有的人也不占额外宽度。
 */
/**
 * 用户表列定义。
 *
 * ⚠️ 2026-10-03：原来是纯字符串数组，表头 `COLUMNS.map` 渲染时**没加任何响应式
 * 类**，而表体「注册时间」那个 td 是 `hidden lg:table-cell`。于是 768≤宽<1024px
 * （平板竖屏到笔电之间）表头渲染 8 列、表体每行只有 7 个格子 —— 「操作」列的按钮
 * 被排到「注册时间」表头下面，点之前看到的表头和实际操作的对象对不上。
 *
 * 改成带 `hideOnNarrow` 的结构，表头和表体读**同一份**定义：断点只写一次，
 * 不可能再分叉。断点用 lg（1024），与表体原有写法一致。
 */
export interface UserColumn {
  key: 'id' | 'user' | 'tier' | 'status' | 'quota' | 'used' | 'created' | 'actions'
  label: string
  /** < 1024px 时整列隐藏（表头与表体同时生效） */
  hideOnNarrow?: boolean
}

export const COLUMNS: readonly UserColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'user', label: '用户' },
  { key: 'tier', label: '套餐' },
  { key: 'status', label: '状态' },
  { key: 'quota', label: '月配额' },
  { key: 'used', label: '已用' },
  { key: 'created', label: '注册时间', hideOnNarrow: true },
  { key: 'actions', label: '操作' },
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

/** tier → 中文。内部值同时会出现在筛选下拉和表格里，两处必须一致。 */
export const TIER_LABELS: Record<string, string> = {
  free: '免费',
  admin: '管理员',
  operator: '运营',
  student: '学生',
  member: '会员',
  pro: '专业版',
}

/** 配额用量的可视化：超过配额要一眼看出来，而不是靠两个数字对比。 */
export function quotaUsage(used: number, monthly: number): {
  ratio: number
  tone: 'ok' | 'warn' | 'over'
} {
  if (monthly <= 0) return { ratio: 0, tone: 'ok' }
  const ratio = used / monthly
  if (used > monthly) return { ratio, tone: 'over' }
  if (ratio >= 0.8) return { ratio, tone: 'warn' }
  return { ratio, tone: 'ok' }
}
