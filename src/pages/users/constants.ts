/** 用户管理列头 */
export const COLUMNS = [
  'ID',
  '邮箱',
  '昵称',
  '角色',
  '套餐',
  '状态',
  '月配额',
  '已用',
  '注册时间',
  '操作',
] as const

/** 套餐过滤（空 = 全部） */
export const TIERS = ['', 'free', 'pro', 'max'] as const

/** 状态过滤（空 = 全部） */
export const STATUSES = ['', 'active', 'suspended', 'deleted'] as const