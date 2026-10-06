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

/**
 * 测试**传入的**这份配置能否连通（不落库）。
 *
 * 2026-10 修一个静默失败：原实现不传任何参数，走 GET，后端 `admin_llm_test`
 * 用 `reload()` 取的是**已保存**配置。于是运营在表单里改了 base_url / model /
 * api_key，点「测试调用」看到的是**旧配置的绿灯** —— 填错的地址能通过测试、
 * 保存成功，然后才在生产推理时炸。整条链路没有任何一处提示测的不是你填的东西。
 *
 * 现在用 POST 把表单态送到后端，后端造一次性 client 测完即关，不写库。
 * GET 版本保留（脚本/老前端可用），但前端不再用它。
 */
export async function testLlm(config: {
  provider: string
  model: string
  api_key: string
  base_url?: string | null
}): Promise<LlmTestResult> {
  const { data } = await apiClient.post('/api/v1/admin/llm/test', config)
  return (data as { data?: LlmTestResult }).data ?? (data as LlmTestResult)
}