import { pageHintClass, pageTitleClass } from '../components/ui'

/**
 * TTS 盲测 —— A8（接口文档 §2.2）。
 *
 * 3 步工作流：发起（setup）→ 打分（submit）→ 揭晓（results revealed_mapping）
 * ⚠️ audio_url 当前是 mock provider，UI 必须标"模拟数据"。
 * ⚠️ 同 evaluator_id 重复提交 = 覆盖式更新（sessionStorage 暂存）。
 * ⚠️ 揭晓按钮前置：评测全部完成后才能展示 revealed_mapping。
 *
 * 本文件是 stub，CP-NEW.4 承接完整实现。
 */
export function TtsBlindTest() {
  return (
    <div>
      <h1 className={pageTitleClass}>TTS 盲测</h1>
      <p className={pageHintClass}>
        数据源：POST /api/v1/admin/tts/blind-test · /submit · /results
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
        3 步 stepper + audio 播放（匿名化 provider） + 揭晓 dialog 骨架，CP-NEW.4 承接
      </div>
    </div>
  )
}

export default TtsBlindTest