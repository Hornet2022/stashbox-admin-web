/**
 * admin API barrel —— CP-NEW.1 起按子模块拆分。
 *
 * 老 import 路径 `'../api/admin'` 通过 api/admin.ts 重导出此 barrel 保持兼容；
 * 新代码优先从 `'../api/admin'` 直接 import 各 feature 子模块（更明确的依赖边界）。
 *
 * 子模块清单（按接口文档 §2.2 缺口编号 A1-A8）：
 * - few-shot-pool  A2/A6 池 + 池运营 5 端点
 * - evaluations    A3 评分 + 标注 + 一致性 3 端点
 * - tier-config    A1 模型路由（tier-config）2 端点
 * - ab-report      A4 A/B 报表 1 端点
 * - audio-variants A5 多码率统计 1 端点
 * - consents       A7 GDPR 同意 1 端点
 * - tts-blind-test A8 TTS 盲测 3 端点
 *
 * 老 admin.ts 仍保留：listUsers / adjustQuota / listArticles / createArticle /
 * forceRetryArticle / invalidateAudio / deleteAdminArticle / listTags / createTag /
 * deleteAdminTag / listPushNotifications / listAuditLog / getStats / getDistillP95 /
 * getLlmConfig / updateLlmConfig / testLlm / getTtsConfig / updateTtsConfig / testTts /
 * exportCsvUrl / downloadCsv
 */

export * from './few-shot-pool'
export * from './evaluations'
export * from './tier-config'
export * from './ab-report'
export * from './audio-variants'
export * from './consents'
export * from './tts-blind-test'