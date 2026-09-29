import type { TtsTestResult } from '../../types'

/**
 * TTS 测试调用的**文案层**，与 `TtsTestPanel`（视图）分开。
 *
 * CP-TTS-TEST-ERR / oxlint(only-export-components)：
 * 之前 `TTS_ERROR_KIND_FALLBACK_HINT` 和 `toastForTtsTestResult` 直接导出在
 * TtsTestPanel.tsx 里，而 TtsSettings.tsx 需要 `toastForTtsTestResult` —— 于是这个
 * 组件文件同时导出组件和非组件，破坏 React Fast Refresh（改组件时整页重载、
 * 本地 state 全丢）。oxlint 的 only-export-components 规则正是报这个。
 *
 * 纯文案/纯函数放这里，TtsTestPanel 变成只导出组件。
 */

/** 前端兜底文案（后端 hint 缺失时用，比如部署了老版本后端） */
export const TTS_ERROR_KIND_FALLBACK_HINT: Record<string, string> = {
  auth: 'API Key 无效或缺失，请检查后重新保存配置',
  forbidden: '账号被限制（可能欠费、无该模型权限或区域受限），请到供应商后台核查',
  notfound: '资源不存在 —— 模型/音色 ID 错、Base URL 路径错或参考音频文件找不到',
  badreq: '请求参数非法，请检查配置',
  ratelimit: '请求过于频繁，请稍后再试',
  timeout: 'TTS 服务未在 timeout 内响应，请稍后重试',
  connect: '无法连接到 TTS 服务端，请检查 Base URL 是否可访问',
  network: '网络传输异常，请检查网络环境或代理设置',
  empty: 'TTS 服务返回了 200 但音频为空，请检查配置或重试',
  missing_dep: '依赖 Python 包未安装，请按提示 pip install 后重启 ai-service',
  subprocess: '本地子进程失败 —— 检查 ffmpeg 是否在路径中、`say` 是否可用',
  business_code: '供应商业务错误码（HTTP 200 但业务失败），请到供应商后台核查',
  internal: '服务端处理异常（响应格式非预期），请联系开发排查',
}

/**
 * toast 文案：成功 / 失败 各分类一句。让用户一眼看出**下一步干啥**，
 * 而不是只看到「失败」两字。
 *
 * 优先级：后端 hint > 前端兜底表 > 原始错误串。后端带 hint 说明它知道根因，
 * 优先用它；老版本后端没有 hint 时才退回前端表。
 */
export function toastForTtsTestResult(result: TtsTestResult): { message: string; kind: 'success' | 'error' | 'info' } {
  if (result.ok) {
    return {
      message: `测试调用成功：${result.bytes_len ?? 0} bytes`,
      kind: 'success',
    }
  }
  const k = result.error_kind ?? ''
  const hint = result.hint ?? TTS_ERROR_KIND_FALLBACK_HINT[k] ?? `测试调用失败（${result.error ?? '未知错误'}）`
  return { message: hint, kind: 'error' }
}
