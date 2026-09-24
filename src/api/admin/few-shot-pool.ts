import { apiClient, normalizeList, unwrap, type ListResult } from './_shared'
import type {
  FewShotKind,
  PoolAuditResult,
  PoolAuditSampleItem,
  PoolCleanupResult,
  PoolExample,
  PoolHealthReport,
} from '../../types'

/**
 * A2 / A6 · few-shot 池（接口文档 §2.2）
 *
 * 挂 ai-service（8103），鉴权 require_admin_or_operator。
 * 5 个端点：health（看板）/ list（条目查询）/ cleanup（危险写）/ audit-sample（抽查采样）/ audit-result（回写评分）
 *
 * CP-NEW.1 起拆为独立模块；老 import 路径 '../api/admin' 通过 barrel 重导出兼容。
 */

/** GET /api/v1/admin/few-shot-pool/health —— 200（内部已兜底，恒 200） */
export async function getPoolHealth(): Promise<PoolHealthReport> {
  const { data } = await apiClient.get('/api/v1/admin/few-shot-pool/health')
  return unwrap<PoolHealthReport>(data)
}

/** GET /api/v1/admin/few-shot-pool?kind=&min_score=&active=&limit=&offset= */
export async function listPool(params: {
  kind?: FewShotKind
  min_score?: number
  active?: boolean
  limit?: number
  offset?: number
} = {}): Promise<ListResult<PoolExample>> {
  const { data } = await apiClient.get('/api/v1/admin/few-shot-pool', { params })
  return normalizeList<PoolExample>(data)
}

/** POST /api/v1/admin/few-shot-pool/cleanup —— 危险操作，reason 必填 */
export async function cleanupPool(reason: string): Promise<PoolCleanupResult> {
  const { data } = await apiClient.post('/api/v1/admin/few-shot-pool/cleanup', { reason })
  return unwrap<PoolCleanupResult>(data)
}

/** GET /api/v1/admin/few-shot-pool/audit-sample?size=N —— cap 50 */
export async function getAuditSample(size = 10): Promise<{ total: number; items: PoolAuditSampleItem[] }> {
  const { data } = await apiClient.get('/api/v1/admin/few-shot-pool/audit-sample', { params: { size } })
  return unwrap<{ total: number; items: PoolAuditSampleItem[] }>(data)
}

/** POST /api/v1/admin/few-shot-pool/audit-result
 *  audit_score ∈ [0,10]（对齐 score_avg 存储域，与 system_score 1-5 不同）
 *  回写算法：new_avg = (old*usage_count + audit) / (usage_count+1) */
export async function postAuditResult(
  exampleId: string,
  auditScore: number,
): Promise<PoolAuditResult> {
  const { data } = await apiClient.post('/api/v1/admin/few-shot-pool/audit-result', {
    example_id: exampleId,
    audit_score: auditScore,
  })
  return unwrap<PoolAuditResult>(data)
}