import { apiClient } from '../client'
import type {
  ImportVoiceResult,
  VoiceCreatePayload,
  VoiceListResult,
  VoicePreviewResult,
  VoiceRow,
  VoiceUpdatePayload,
} from '../../types'

/**
 * 音色库端点 —— /api/v1/admin/tts/voices 全家。
 *
 * CP-TTS-VOICE：IndexTTS 是零样本克隆，音色 = (参考音频, 参考文本) 对，
 * 所以这里的「音色」不是 provider 那种填个 voice 名字就行的字符串 ——
 * 管理员必须同时给出 ref_audio 和 ref_text，且两者内容要对得上。
 *
 * 参考音频两条输入路径（二选一）：
 *   ref_audio_url  —— 直接填本机绝对路径（dev 常用）或 S3/OSS URL
 *   ref_audio_b64 —— 浏览器读文件转 base64，走 JSON 提交
 *
 * 刻意用 base64 而不是 multipart：admin-web 的 axios 实例硬编码了
 * Content-Type: application/json（src/api/client.ts:43-45），FormData 需要
 * 逐请求覆盖 header，本项目无先例。base64 体积涨 33%，但参考音频通常
 * 3~15 秒，可接受。
 */

function unwrap<T>(data: unknown): T {
  return (data as { data?: T }).data ?? (data as T)
}

export async function listVoices(): Promise<VoiceListResult> {
  const { data } = await apiClient.get('/api/v1/admin/tts/voices')
  const body = unwrap<{ items?: VoiceRow[] }>(data)
  return { items: body?.items ?? [] }
}

export async function createVoice(payload: VoiceCreatePayload): Promise<VoiceRow> {
  const { data } = await apiClient.post('/api/v1/admin/tts/voices', payload)
  return unwrap<VoiceRow>(data)
}

export async function updateVoice(
  voiceId: string,
  payload: VoiceUpdatePayload,
): Promise<VoiceRow> {
  const { data } = await apiClient.put(`/api/v1/admin/tts/voices/${voiceId}`, payload)
  return unwrap<VoiceRow>(data)
}

export async function deleteVoice(voiceId: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/tts/voices/${voiceId}`)
}

/**
 * 试听超时的**下限**（毫秒）。
 *
 * BUG#11（2026-09-30 自由拓展自测发现）：`apiClient` 全局 timeout 是 15s
 * （`src/api/client.ts:40`），而试听是**真调 oMLX 合成**——IndexTTS 零样本克隆
 * 实测约 2 分钟。于是这个按钮**从来没成功过**：请求在 15s 被 axios 掐掉，
 * 页面只弹一句「请求超时（15s）—— 试听失败可能卡死或未启动」。
 * 症状极具误导性 —— 提示说「可能卡死或未启动」，但 oMLX 好好的，
 * 合成也确实在进行，只是前端不等了。
 *
 * 为什么之前没被发现：后端端点有单测、页面有 8 条 e2e，唯独**没有一条真的
 * 点过试听**（它太慢，套件里被当成"不值得测"）。于是"后端能合成"被当成了
 * "功能可用"。
 *
 * 取 180s：实测 ~120s，留 1.5 倍余量；再长的话 oMLX 真卡死时要等更久才发现。
 */
const PREVIEW_TIMEOUT_MS = 180_000

/** 试听：真调 oMLX 合成一段，不是假装成功。参考音频/参考文本对不上只有真合成才会暴露。 */
export async function previewVoice(
  voiceId: string,
  text: string,
): Promise<VoicePreviewResult> {
  const { data } = await apiClient.post(
    `/api/v1/admin/tts/voices/${voiceId}/preview`,
    { text },
    { timeout: PREVIEW_TIMEOUT_MS },
  )
  return unwrap<VoicePreviewResult>(data)
}

/**
 * 把当前全局 TTS 配置里的 indextts_ref_audio 收编成音色库第一条。
 *
 * 存在的理由：迁移 0033 刻意没 seed 默认音色（迁移里读 env 会把本机绝对路径
 * 固化进库，换机器就是死路径），冷启动必须有这么一个「零输入」入口。
 * 幂等：已收编过会返回 created=false，不造重复行。
 */
export async function importVoiceFromConfig(): Promise<ImportVoiceResult> {
  const { data } = await apiClient.post('/api/v1/admin/tts/voices/import-from-config')
  return unwrap<ImportVoiceResult>(data)
}

/** 浏览器读 wav 文件 → base64（去掉 data URL 前缀）。 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}
