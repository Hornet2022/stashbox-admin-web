import { apiClient, normalizeList, unwrap, type ListResult } from './_shared'
import type {
  Evaluation,
  EvaluationAnnotation,
  EvaluationAnnotationPayload,
  EvaluatorAgreement,
} from '../../types'

/**
 * A3 · 评测员标注 + 一致性（接口文档 §2.2）
 *
 * 挂 ai-service（8103），鉴权 require_admin_or_operator。
 * 3 个端点：list（评分列表）/ annotate（评测员写新行）/ agreement（一致性聚合）
 *
 * 契约注意：list 响应**不含** comment / evaluator_id（接口文档 §2.2），
 * 如要展示标注归属必须改后端契约。
 */

/** GET /api/v1/admin/evaluations */
export async function listEvaluations(params: {
  task_id?: string
  user_id?: number
  auto_flag?: boolean
  min_score?: number
  max_score?: number
  limit?: number
  offset?: number
} = {}): Promise<ListResult<Evaluation>> {
  const { data } = await apiClient.get('/api/v1/admin/evaluations', { params })
  return normalizeList<Evaluation>(data)
}

/** POST /api/v1/admin/evaluations/{id}/annotate —— 写新行（不改原行） */
export async function annotateEvaluation(
  evaluationId: string,
  payload: EvaluationAnnotationPayload,
): Promise<EvaluationAnnotation> {
  const { data } = await apiClient.post(
    `/api/v1/admin/evaluations/${evaluationId}/annotate`,
    payload,
  )
  return unwrap<EvaluationAnnotation>(data)
}

/** GET /api/v1/admin/evaluations/agreement?task_id= —— 0-1 一致性系数 */
export async function getAgreement(taskId?: string): Promise<EvaluatorAgreement> {
  const { data } = await apiClient.get('/api/v1/admin/evaluations/agreement', {
    params: taskId ? { task_id: taskId } : undefined,
  })
  return unwrap<EvaluatorAgreement>(data)
}