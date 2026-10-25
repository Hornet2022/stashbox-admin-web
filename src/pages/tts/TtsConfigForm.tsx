import { Eye, EyeOff } from 'lucide-react'
import { Field, buttonGhostClass, buttonPrimaryClass, inputClass } from '../../components/ui'
import { PROVIDERS, PROVIDER_HINT, type TtsProvider } from './constants'
import type { TtsConfigUpdatePayload } from '../../api/admin'
import type { FormEvent } from 'react'

/**
 * TTS 配置编辑表单 —— 5 个 provider 的字段组（按 provider conditional 渲染）。
 *
 * 行为契约：
 * - provider select 切换：清空无关字段（保留当前 provider 的字段）
 * - api_key 留空 = 不改动已存的那把 key（PUT 语义）
 * - **显式 null = 清除**已存的那把 key（后端 2026-10-22 起支持，此前清不掉）
 * - 保存时按当前 provider 拼 payload，调 updateTtsConfig，热生效
 */
export interface TtsConfigFormProps {
  provider: TtsProvider
  data: TtsConfigFields
  /** openai 那把 key 有没有（后端分 provider 的标志，不用共用的 api_key_set） */
  openaiApiKeySet: boolean
  /** 豆包那把 key 有没有 */
  doubaoApiKeySet: boolean
  showApiKey: boolean
  saving: boolean
  onProviderChange: (p: TtsProvider) => void
  onFieldChange: (field: keyof TtsConfigFields, value: string) => void
  onToggleApiKey: () => void
  /** 清除已存的那把 key（provider 决定清哪一把） */
  onClearApiKey: (provider: 'openai' | 'doubao') => void
  /** 两步确认：正等着用户再点一次的那个 provider（null = 没在等） */
  confirmClear?: 'openai' | 'doubao' | null
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onTest: () => void
  testing: boolean
  /** 探测音色（2026-10-21） */
  onProbeVoices: () => void
  probing: boolean
  /** 探测到的音色；空数组 = 还没探 / 探不出来 */
  supportedVoices: string[]
  /** 探测结果的提示语（探不出来时说明原因） */
  voiceProbeHint: string | null
}

/** 表单所有字段的状态（受父组件 useState 控制） */
export interface TtsConfigFields {
  edgeVoice: string
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
  openaiVoice: string
  /** 风格控制 prompt（上游 instructions）—— 同一篇每段逐字相同 */
  openaiInstructions: string
  openaiLanguage: string
  /**
   * 托管端点零样本克隆的参考音频（URL/路径）与参考文本。
   *
   * ⚠️ 原先参考音频只有 indextts_* 那组（本地 oMLX），而生产 provider 是
   * openai ⇒ 全局兜底读不到、后台「从当前配置导入音色」按钮也必然 400。
   */
  openaiRefAudio: string
  openaiRefText: string
  doubaoApiKey: string
  doubaoToken: string
  doubaoAppId: string
  doubaoVoice: string
  doubaoResourceId: string
  localVoice: string
  ffmpegBin: string
  indexttsBaseUrl: string
  indexttsModel: string
  indexttsRefAudio: string
  indexttsRefText: string
}

/** 简化 type guard：检测当前字段值（结构等价 TtsConfigUpdatePayload 但前端用 FormData 风格） */
export type TtsPayload = TtsConfigUpdatePayload

export function TtsConfigForm({
  provider,
  data,
  openaiApiKeySet,
  doubaoApiKeySet,
  showApiKey,
  saving,
  onProviderChange,
  onFieldChange,
  onToggleApiKey,
  onClearApiKey,
  confirmClear,
  onSubmit,
  onTest,
  testing,
  onProbeVoices,
  probing,
  supportedVoices,
  voiceProbeHint,
}: TtsConfigFormProps) {
  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
      <header className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-700/60">
        <h2 className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
          修改配置
        </h2>
      </header>
      <div className="px-4 py-4">
        <form className="max-w-xl space-y-4" onSubmit={onSubmit}>
          <Field label="Provider">
            <select
              value={provider}
              onChange={(e) => onProviderChange(e.target.value as TtsProvider)}
              className={inputClass}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              {PROVIDER_HINT[provider]}
            </p>
          </Field>

          {provider === 'edge' && (
            <Field label="Voice（Edge TTS 音色 ID）">
              <input
                type="text"
                value={data.edgeVoice}
                onChange={(e) => onFieldChange('edgeVoice', e.target.value)}
                placeholder="zh-CN-XiaoxiaoNeural"
                className={`t-input ${inputClass}`}
              />
            </Field>
          )}

          {provider === 'openai' && (
            <>
              <Field label="API key（留空表示不改动已存的那把）">
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={data.openaiApiKey}
                    onChange={(e) => onFieldChange('openaiApiKey', e.target.value)}
                    placeholder={openaiApiKeySet ? '已保存，留空则不变' : 'sk-...'}
                    autoComplete="new-password"
                    className={`t-input ${inputClass}`}
                  />
                  <button
                    type="button"
                    className={buttonGhostClass}
                    onClick={onToggleApiKey}
                    aria-label={showApiKey ? '隐藏 API key' : '显示 API key'}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              {/*
                清除已存的那把 key（2026-10-22）。

                为什么需要这个按钮：**留空 = 不改动**是前端契约（用户没重新输入
                时不能把 key 抹了），于是「清掉一把已经不用的 key」就没有任何入口 ——
                DB 里那把早已失效的 key 一直躺着，配置页还显示「已保存」，
                纯属误导。

                放在 Field **外面**：Field 渲染的是 <label>，label 里的可点元素
                会被 label 的点击行为吞掉（a11y 上也不该嵌套）。
              */}
              {openaiApiKeySet && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={buttonGhostClass}
                    onClick={() => onClearApiKey('openai')}
                  >
                    {confirmClear === 'openai' ? '确认清除？' : '清除已保存的 Key'}
                  </button>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {confirmClear === 'openai'
                      ? '再点一次确认。清除后当前 provider 若没有别的 key，合成会 401。'
                      : '已保存一把 Key。换成别的 provider 后它就没用了，可以清掉。'}
                  </span>
                </div>
              )}
              <Field label="Base URL">
                <input
                  type="text"
                  value={data.openaiBaseUrl}
                  onChange={(e) => onFieldChange('openaiBaseUrl', e.target.value)}
                  placeholder="https://api.openai.com/v1（火山方舟填 https://ark.cn-beijing.volces.com/api/v3）"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <Field label="Model">
                <input
                  type="text"
                  value={data.openaiModel}
                  onChange={(e) => onFieldChange('openaiModel', e.target.value)}
                  placeholder="tts-1"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <Field label="Voice">
                {/*
                  ⚠️ Field 内部是 <label>，**不能在里面放 button** ——
                     label 里的可点元素会被 label 的点击行为吞掉，
                     而且 a11y 上是 label 嵌套交互元素（不合规）。
                     所以 Voice 这一项用 div 自己包 label，input 单独留在
                     Field 里，探测按钮与候选列表放在 Field 外面。
                */}
                <input
                  type="text"
                  value={data.openaiVoice}
                  onChange={(e) => onFieldChange('openaiVoice', e.target.value)}
                  placeholder="alloy"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              {/*
                探测音色（2026-10-21）。

                为什么需要：第三方 OpenAI 兼容服务的音色名跟 OpenAI 官方
                （alloy/echo/fable…）**完全不一样**。代码默认 voice 是
                `alloy`，用户接非官方服务必然 400，而服务报错里其实
                带着可用列表，只是埋在 detail 里。

                探测 = 发一次故意用错 voice 的请求，让服务把列表说出来。
                候选可直接点，点完就填进输入框。
              */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onProbeVoices}
                  disabled={probing}
                  className={buttonGhostClass}
                >
                  {probing ? '探测中…' : '探测可用音色'}
                </button>
                {voiceProbeHint && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {voiceProbeHint}
                  </span>
                )}
              </div>
              {supportedVoices.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {supportedVoices.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => onFieldChange('openaiVoice', v)}
                      className={`rounded border px-2 py-0.5 font-mono text-xs transition-colors ${
                        data.openaiVoice === v
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:border-emerald-400 hover:text-emerald-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300'
                      }`}
                      title={`点击填入 ${v}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
              {/*
                零样本克隆的参考音频（2026-10-25）。

                为什么托管端点也需要：生产 provider 是 openai（托管端点），
                它的 `voice` 是**预设音色名**，同一个人不保证稳定 —— 之前
                「分段像换人」的根因就在这里。解法是零样本克隆：给一段参考音频
                + 它的逐字转写，上游照着克隆。

                这两个字段同时是**冷启动入口**：音色库为空时，
                「从当前配置导入」按钮读的就是它们（原先只读 indextts_*，
                而生产 provider 是 openai ⇒ 那个按钮必然 400，是死按钮）。
              */}
              <Field label="参考音频（零样本克隆，克隆时必填）">
                <input
                  type="text"
                  value={data.openaiRefAudio}
                  onChange={(e) => onFieldChange('openaiRefAudio', e.target.value)}
                  placeholder="https://.../ref.wav 或本机绝对路径"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <Field label="参考文本（必须与参考音频内容逐字一致）">
                <input
                  type="text"
                  value={data.openaiRefText}
                  onChange={(e) => onFieldChange('openaiRefText', e.target.value)}
                  placeholder="今天天气不错，我们一起来看看这条新闻讲了什么内容。"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              {/*
                风格控制 prompt（2026-10-23）。

                上游字段名就叫 `instructions`（传数字会被上游 400 拒掉 →
                说明它是**真的被识别**的字段，不是被静默忽略的摆设）。
                CustomVoice 模型的音色由 Voice 定，**语气/情绪/语速由它定**。

                为什么它跟「分段音色一致」直接相关：长稿是分段合成的，
                每段是一次独立请求。这句 prompt 会**逐字**发给每一段 →
                段间的风格取向一致（实测：加「悲伤低沉」→ 时长变长、基频变低；
                加「开心轻快」→ 变短、变高）。

                ⚠️ 但它压不住单次采样本身的随机波动 —— 实测同条件下两段
                的基频离散度 18.5%，加了 prompt 是 18.1%（基本没变）。
                真正把离散度压到 1.8% 的是后端的音域对齐。
                所以这里的提示要说实话，不能让运营以为填了它就万事大吉。
              */}
              <Field label="风格控制（Instructions）">
                <textarea
                  value={data.openaiInstructions}
                  onChange={(e) => onFieldChange('openaiInstructions', e.target.value)}
                  rows={3}
                  placeholder="留空 = 不控制。例如：用平稳、客观的播音腔朗读，语速适中。"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <Field label="语言（Language，可留空）">
                <input
                  type="text"
                  value={data.openaiLanguage}
                  onChange={(e) => onFieldChange('openaiLanguage', e.target.value)}
                  placeholder="留空 = 不传"
                  className={`t-input ${inputClass}`}
                />
              </Field>
            </>
          )}

          {provider === 'doubao' && (
            <>
              <Field label="API key（Coding Plan 专属）">
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={data.doubaoApiKey}
                    onChange={(e) => onFieldChange('doubaoApiKey', e.target.value)}
                    placeholder={doubaoApiKeySet ? '已保存，留空则不变' : '从火山方舟控制台获取'}
                    autoComplete="new-password"
                    className={`t-input ${inputClass}`}
                  />
                  <button
                    type="button"
                    className={buttonGhostClass}
                    onClick={onToggleApiKey}
                    aria-label={showApiKey ? '隐藏 API key' : '显示 API key'}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              {doubaoApiKeySet && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={buttonGhostClass}
                    onClick={() => onClearApiKey('doubao')}
                  >
                    {confirmClear === 'doubao' ? '确认清除？' : '清除已保存的 Key'}
                  </button>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {confirmClear === 'doubao'
                      ? '再点一次确认。清除后当前 provider 若没有别的 key，合成会 401。'
                      : '已保存一把 Key（API key 与旧版 Token 一起清）。'}
                  </span>
                </div>
              )}
              <Field label="Token（旧版兼容，可留空）">
                <input
                  type="password"
                  value={data.doubaoToken}
                  onChange={(e) => onFieldChange('doubaoToken', e.target.value)}
                  placeholder="旧版 TOKEN，留空表示不改动"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <Field label="App ID（旧版兼容，可留空）">
                <input
                  type="text"
                  value={data.doubaoAppId}
                  onChange={(e) => onFieldChange('doubaoAppId', e.target.value)}
                  placeholder="留空表示不改动"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <Field label="Voice（音色 ID）">
                <input
                  type="text"
                  value={data.doubaoVoice}
                  onChange={(e) => onFieldChange('doubaoVoice', e.target.value)}
                  placeholder="BV001_streaming"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <Field label="Resource ID">
                <input
                  type="text"
                  value={data.doubaoResourceId}
                  onChange={(e) => onFieldChange('doubaoResourceId', e.target.value)}
                  placeholder="seed-tts-2.0"
                  className={`t-input ${inputClass}`}
                />
              </Field>
            </>
          )}

          {provider === 'local' && (
            <>
              <Field label="Voice（macOS 中文嗓音）">
                <input
                  type="text"
                  value={data.localVoice}
                  onChange={(e) => onFieldChange('localVoice', e.target.value)}
                  placeholder="Tingting（可换：Eddy/Flo/Reed/Rocko/Sandy）"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <Field label="ffmpeg 路径">
                <input
                  type="text"
                  value={data.ffmpegBin}
                  onChange={(e) => onFieldChange('ffmpegBin', e.target.value)}
                  placeholder="/opt/homebrew/bin/ffmpeg"
                  className={`t-input ${inputClass}`}
                />
              </Field>
            </>
          )}

          {provider === 'indextts' && (
            <>
              <Field label="服务地址（oMLX OpenAI 兼容 base）">
                <input
                  type="text"
                  value={data.indexttsBaseUrl}
                  onChange={(e) => onFieldChange('indexttsBaseUrl', e.target.value)}
                  placeholder="http://127.0.0.1:8008/v1"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <Field label="模型名">
                <input
                  type="text"
                  value={data.indexttsModel}
                  onChange={(e) => onFieldChange('indexttsModel', e.target.value)}
                  placeholder="IndexTTS-1.5"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <Field label="参考音频（服务端 wav 绝对路径，音色来源）">
                <input
                  type="text"
                  value={data.indexttsRefAudio}
                  onChange={(e) => onFieldChange('indexttsRefAudio', e.target.value)}
                  placeholder="/Users/hornet/work/stashbox/backend/data/voices/tingting_ref.wav"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <Field label="参考音频转录文本（必须与音频内容一致）">
                <input
                  type="text"
                  value={data.indexttsRefText}
                  onChange={(e) => onFieldChange('indexttsRefText', e.target.value)}
                  placeholder="今天天气不错，我们一起来看看这条新闻讲了什么内容。"
                  className={`t-input ${inputClass}`}
                />
              </Field>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                IndexTTS 是零样本音色克隆：音色由参考音频决定（Voice 字段无效）。
                参考音频建议 3–10 秒、安静环境、16kHz 单声道 wav。
              </p>
            </>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button type="submit" className={buttonPrimaryClass} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </button>
            <button
              type="button"
              className={buttonGhostClass}
              onClick={onTest}
              disabled={testing}
            >
              {testing ? '调用中…' : '测试调用'}
            </button>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              修改后立即热生效，下一次蒸馏任务直接用新 provider
            </span>
          </div>
        </form>
      </div>
    </section>
  )
}