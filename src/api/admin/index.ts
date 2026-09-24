/**
 * admin API barrel —— CP-NEW.1 起按子模块拆分，CP-NEW.15 进一步把老端点也拆出去。
 *
 * 老 import 路径 `'../api/admin'` 通过 api/admin.ts 重导出此 barrel 保持兼容；
 * 新代码优先从 `'../api/admin'` 直接 import 各 feature 子模块（更明确的依赖边界）。
 *
 * 子模块清单（按业务域）：
 * - few-shot-pool  A2/A6 池 + 池运营 5 端点
 * - evaluations    A3 评分 + 标注 + 一致性 3 端点
 * - tier-config    A1 模型路由（tier-config）2 端点
 * - ab-report      A4 A/B 报表 1 端点
 * - audio-variants A5 多码率统计 1 端点
 * - consents       A7 GDPR 同意 1 端点
 * - tts-blind-test A8 TTS 盲测 3 端点
 * - users          GET /admin/users + quota-adjust
 * - articles       GET /articles + 4 个写动作
 * - tags           GET /tags + POST / DELETE
 * - push           GET /push-notifications
 * - audit-log      GET /audit-log
 * - dashboard      GET /stats + /distill-p95
 * - llm            GET/PUT /llm/config + /test
 * - tts            GET/PUT /tts/config + /test
 * - csv            exportCsvUrl + downloadCsv（4 种 kind）
 */

// 听感运营 7 个新端点
export * from './few-shot-pool'
export * from './evaluations'
export * from './tier-config'
export * from './ab-report'
export * from './audio-variants'
export * from './consents'
export * from './tts-blind-test'

// 老端点（CP-NEW.15 拆出）
export * from './users'
export * from './articles'
export * from './tags'
export * from './push'
export * from './audit-log'
export * from './dashboard'
export * from './llm'
export * from './tts'
export * from './csv'