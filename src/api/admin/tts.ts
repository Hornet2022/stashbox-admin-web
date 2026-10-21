import { apiClient } from '../client'
import type { TtsConfig, TtsTestResult, TtsVoiceProbeResult } from '../../types'

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

/**
 * 测试**传入的**这份 TTS 配置能否合成（不落库）。
 *
 * 2026-10 修：与 llm.ts 的 testLlm 同一个静默失败 —— 原实现不传参，
 * 后端 `admin_tts_test` 走 `tts_reload()` 取的是**已保存**配置，表单里刚填的
 * 错值能测出绿灯。请求体形状与 PUT /admin/tts/config 一致（复用其合并语义）。
 */
export async function testTts(config: Record<string, unknown>): Promise<TtsTestResult> {
  const { data } = await apiClient.post('/api/v1/admin/tts/test', config)
  return (data as { data?: TtsTestResult }).data ?? (data as TtsTestResult)
}

/**
 * 探测该 TTS 模型支持哪些 voice（2026-10-21）。
 *
 * 背景：第三方 OpenAI 兼容服务的音色名跟 OpenAI 官方完全不一样
 * （官方是 alloy/echo/fable…，实测那家是 aiden/dylan/eric…）。
 * 代码里默认 voice 是 `alloy`，用户接非官方服务时必然 400，
 * 而错误里其实带着答案，只是埋在 detail 里。
 *
 * 后端发一次**故意用错 voice** 的请求，服务把可用列表带在 400 里，
 * 后端解析后结构化返回。解析不出来（服务不校验 voice）就返回空列表。
 *
 * 合并语义与 testTts 一致：空值 = 沿用已存配置。
 */
export async function probeTtsVoices(
  config: Record<string, unknown>,
): Promise<TtsVoiceProbeResult> {
  const { data } = await apiClient.post('/api/v1/admin/tts/voices/probe', config)
  return (data as { data?: TtsVoiceProbeResult }).data ?? (data as TtsVoiceProbeResult)
}
