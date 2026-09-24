import { apiClient, unwrap } from './_shared'
import type { AudioVariantsStats } from '../../types'

/**
 * A5 · 多码率变体统计（接口文档 §2.2）
 *
 * 挂 ai-service（8103），鉴权 require_admin_or_operator。
 * 用于 CP7.4 预加载调优：coverage_ratio = covered_articles / done_articles。
 */

/** GET /api/v1/admin/audio-variants/stats —— 200（内部已兜底） */
export async function getAudioVariantsStats(): Promise<AudioVariantsStats> {
  const { data } = await apiClient.get('/api/v1/admin/audio-variants/stats')
  return unwrap<AudioVariantsStats>(data)
}