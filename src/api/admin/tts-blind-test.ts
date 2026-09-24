import { apiClient, unwrap } from './_shared'
import type {
  BlindTestResults,
  BlindTestSetup,
  BlindTestSetupPayload,
  BlindTestSubmit,
  BlindTestSubmitPayload,
} from '../../types'

/**
 * A8 · TTS 盲测（接口文档 §2.2）
 *
 * 挂 ai-service（8103），鉴权 require_admin_or_operator。
 * 3 步工作流：setup（发起）→ submit（评测员打分）→ results（揭晓）
 *
 * ⚠️ 现状：合成走 mock（假 URL 可播性不保证，链路先行）；
 * 返回的 audio_url 已匿名化（不泄漏 provider 名 —— 盲测有效性依赖这一点，前端不要展示 mapping）。
 * ⚠️ 盲测会话存 ai-service **进程内存**（24h TTL）：单 worker 部署可用；重启/多 worker 会丢。
 * ⚠️ 同一 evaluator_id 重复提交 = 覆盖式更新。
 */

/** POST /api/v1/admin/tts/blind-test —— text 1-500 字符，providers 2-6 个 */
export async function createBlindTest(payload: BlindTestSetupPayload): Promise<BlindTestSetup> {
  const { data } = await apiClient.post('/api/v1/admin/tts/blind-test', payload)
  return unwrap<BlindTestSetup>(data)
}

/** POST /api/v1/admin/tts/blind-test/{blind_id}/submit —— evaluator_id + scores 共存 */
export async function submitBlindTest(
  blindId: string,
  payload: BlindTestSubmitPayload,
): Promise<BlindTestSubmit> {
  const { data } = await apiClient.post(
    `/api/v1/admin/tts/blind-test/${blindId}/submit`,
    payload,
  )
  return unwrap<BlindTestSubmit>(data)
}

/** GET /api/v1/admin/tts/blind-test/{blind_id}/results —— 揭晓端点
 *  revealed_mapping 仅在评测全部完成后展示给运营 */
export async function getBlindTestResults(blindId: string): Promise<BlindTestResults> {
  const { data } = await apiClient.get(`/api/v1/admin/tts/blind-test/${blindId}/results`)
  return unwrap<BlindTestResults>(data)
}