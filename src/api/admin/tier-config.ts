import { apiClient, unwrap } from './_shared'
import type { TierConfig, TierConfigUpdatePayload } from '../../types'

/**
 * A1 · tier-config 模型路由（接口文档 §2.2，含 D2 接线）
 *
 * 挂 ai-service（8103），鉴权 require_admin_or_operator。
 * GET 响应永不含密钥；PUT 成功后前端**必须** GET 回读 source=='db' 确认生效。
 * warnings 非空时 UI 必须给黄色提示条（防止运营配未实现 client 的 provider）。
 *
 * 生效链路：蒸馏任务启动前 reload → resolve_tier_map()（Redis 5s 缓存 + 写后立即失效）
 * → pipeline Step1/2 按 ctx.target_tier + 生效 provider 选 model。无需重启 worker。
 */

/** GET /api/v1/admin/tier-config */
export async function getTierConfig(): Promise<TierConfig> {
  const { data } = await apiClient.get('/api/v1/admin/tier-config')
  return unwrap<TierConfig>(data)
}

/** PUT /api/v1/admin/tier-config —— 允许部分覆盖 */
export async function updateTierConfig(payload: TierConfigUpdatePayload): Promise<TierConfig> {
  const { data } = await apiClient.put('/api/v1/admin/tier-config', payload)
  return unwrap<TierConfig>(data)
}