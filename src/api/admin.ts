/**
 * CP-NEW.15 —— 把老 admin 端点全部拆到 `api/admin/*` 子模块。
 *
 * 老 admin.ts 现在只剩 barrel 重导出 + 兼容性类型 alias。
 * 老 import 路径 `'../api/admin'` 完全保持兼容（逐个 export 子模块的所有命名导出）。
 */

// 直接列每个子模块的所有命名导出 —— 这是为了避免 `export *` 在 vite/oxc 下的
// re-export chain 太深时偶发的"找不到导出"问题。

// 新端点（CP-NEW.1）
export * from './admin/few-shot-pool'
export * from './admin/evaluations'
export * from './admin/tier-config'
export * from './admin/ab-report'
export * from './admin/audio-variants'
export * from './admin/consents'
export * from './admin/tts-blind-test'

// 老端点（CP-NEW.15 拆出）
export * from './admin/users'
export * from './admin/articles'
export * from './admin/tags'
export * from './admin/push'
export * from './admin/audit-log'
export * from './admin/dashboard'
export * from './admin/llm'
export * from './admin/tts'
export * from './admin/csv'

// 兼容类型 alias —— 老 admin.ts 末尾的 PageParams re-export
export type { PageParams } from '../types'
export type { LlmConfigUpdatePayload, TtsConfigUpdatePayload } from '../types'