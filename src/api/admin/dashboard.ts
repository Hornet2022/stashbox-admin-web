import { apiClient } from '../client'
import type { DashboardStats, DistillP95Response } from '../../types'

/**
 * Dashboard + 蒸馏耗时端点 —— GET /admin/stats + GET /admin/distill-p95。
 *
 * CP-NEW.15：从老 api/admin.ts 拆出。合并到一个文件因为它们都服务于 Dashboard 页。
 */

export async function getStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get('/api/v1/admin/stats')
  return (data as { data?: DashboardStats }).data ?? (data as DashboardStats)
}

export async function getDistillP95(): Promise<DistillP95Response> {
  const { data } = await apiClient.get('/api/v1/admin/distill-p95')
  return (data as { data?: DistillP95Response }).data ?? (data as DistillP95Response)
}