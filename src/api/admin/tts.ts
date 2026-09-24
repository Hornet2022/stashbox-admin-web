import { apiClient } from '../client'
import type { TtsConfig, TtsTestResult } from '../../types'

/**
 * TTS 配置端点 —— GET/PUT /api/v1/admin/tts/config + /test。
 *
 * CP-NEW.15：从老 api/admin.ts 拆出。
 *
 * TTS 配置五种 provider：edge / openai / doubao / local / indextts（mock 不暴露）。
 * 保存后端立即 reload factory（热生效，不用重启 ai-service）。
 */

export async function getTtsConfig(): Promise<TtsConfig> {
  const { data } = await apiClient.get('/api/v1/admin/tts/config')
  return (data as { data?: TtsConfig }).data ?? (data as TtsConfig)
}

export async function updateTtsConfig(
  payload: Record<string, unknown>,
): Promise<TtsConfig> {
  const { data } = await apiClient.put('/api/v1/admin/tts/config', payload)
  return (data as { data?: TtsConfig }).data ?? (data as TtsConfig)
}

export async function testTts(): Promise<TtsTestResult> {
  const { data } = await apiClient.post('/api/v1/admin/tts/test')
  return (data as { data?: TtsTestResult }).data ?? (data as TtsTestResult)
}