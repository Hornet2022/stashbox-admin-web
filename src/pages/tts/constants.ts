/**
 * TTS 配置常量 —— 5 个 provider 列表 + hint + 卡片 class 常量
 *
 * 注意：mock provider 仅后端单测/CI 用，不在管理后台暴露
 */
export const PROVIDERS = ['edge', 'openai', 'doubao', 'local', 'indextts'] as const
export type TtsProvider = (typeof PROVIDERS)[number]

/** provider 简短说明 —— 卡片顶部 hint 用 */
export const PROVIDER_HINT: Record<TtsProvider, string> = {
  edge: '微软 Edge TTS（免费，需 pip install edge-tts）',
  openai: 'OpenAI 兼容协议（火山方舟/OpenAI/Azure 都用这一组）',
  doubao: '火山引擎豆包 TTS（Coding Plan HTTP POST）',
  local: 'macOS say + ffmpeg（零凭证、纯本地，仅 macOS）',
  indextts: 'IndexTTS-1.5 零样本克隆（oMLX /v1/audio/speech，macmini 本地 GPU）',
}

/** 表单字段默认值（首次 mount 时使用，与 useEffect 中后端 GET 同步后的 fallback 一致） */
export const DEFAULT_VALUES = {
  edgeVoice: 'zh-CN-XiaoxiaoNeural',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: 'tts-1',
  openaiVoice: 'alloy',
  /**
   * 风格控制 prompt 的默认留空 —— 空 = 不发这个字段（后端只在非空时才发）。
   *
   * 为什么不预填一句：这句话会**逐字**发给上游、作用于每一段，
   * 等于替运营决定了整篇文章的语气。默认不填，运营自己写。
   */
  openaiInstructions: '',
  openaiLanguage: '',
  doubaoVoice: 'BV001_streaming',
  doubaoResourceId: 'seed-tts-2.0',
  localVoice: 'Tingting',
  ffmpegBin: '/opt/homebrew/bin/ffmpeg',
  indexttsBaseUrl: 'http://127.0.0.1:8008/v1',
  indexttsModel: 'IndexTTS-1.5',
} as const