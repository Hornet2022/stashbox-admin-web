import apiClient from '../client'
import type { ListResult } from '../../types'

/**
 * admin 子模块共享 helper —— 仅供 `api/admin/*` 内部使用。
 *
 * unwrap：剥掉 api-gateway 的 {code,message,data} 包装层
 * normalizeList：分页响应归一化（兼容 items / list / records / tags 四种命名）
 *
 * CP-NEW.1：从老 api/admin.ts 拆出来；新端点子模块统一从这里 import，
 * 老 admin.ts 内部仍保留 inline 版本（不动既有逻辑）。
 */

/** 剥掉 api-gateway 的 {code,message,data} 包装 */
export function unwrap<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    ('code' in payload || 'message' in payload)
  ) {
    return (payload as { data: T }).data
  }
  return payload as T
}

/** 分页响应归一化：兼容数组 / items / list / records / tags 四种形态 */
export function normalizeList<T>(payload: unknown): ListResult<T> {
  const data = unwrap<unknown>(payload)

  if (Array.isArray(data)) {
    return { items: data as T[], total: data.length }
  }

  if (data && typeof data === 'object') {
    const obj = data as {
      items?: T[]
      list?: T[]
      records?: T[]
      tags?: T[]
      total?: number
      count?: number
    }
    const items = obj.items ?? obj.list ?? obj.records ?? obj.tags ?? []
    return { items, total: obj.total ?? obj.count ?? items.length }
  }

  return { items: [], total: 0 }
}

export { apiClient }
export type { ListResult }