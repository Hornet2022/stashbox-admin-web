import { apiClient } from '../client'
import type { LlmConfig, LlmTestResult } from '../../types'

/**
 * LLM 配置端点 —— GET/PUT /api/v1/admin/llm/config + /test。
 *
 * CP-NEW.15：从老 api/admin.ts 拆出。
 */

export async function getLlmConfig(): Promise<LlmConfig> {
  const { data } = await apiClient.get('/api/v1/admin/llm/config')
  return (data as { data?: LlmConfig }).data ?? (data as LlmConfig)
}

export async function updateLlmConfig(payload: {
  provider?: string
  model?: string
  api_key?: string
  base_url?: string | null
  temperature?: number | null
  max_tokens?: number | null
}): Promise<LlmConfig> {
  const { data } = await apiClient.put('/api/v1/admin/llm/config', payload)
  return (data as { data?: LlmConfig }).data ?? (data as LlmConfig)
}

export async function testLlm(): Promise<LlmTestResult> {
  // 网关注册的是 GET /api/v1/admin/llm/test（非 POST，2026-09-24 回归修正）
  const { data } = await apiClient.get('/api/v1/admin/llm/test')
  return (data as { data?: LlmTestResult }).data ?? (data as LlmTestResult)
}