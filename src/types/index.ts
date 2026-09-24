/**
 * stashbox-admin-web 全局类型定义
 *
 * 字段以后端 v1 §3.6 admin 端点为参考（snake_case）。
 * 后端尚未上线的端点，字段按任务包约定先声明，实际响应有偏差时在
 * src/api/admin.ts 的 normalize 层做兼容。
 */

/** 统一后端响应包装（api-gateway 约定） */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** 分页请求参数 */
export interface PageParams {
  page?: number
  size?: number
}

/** 分页响应体（后端可能是 items / list / records 三种命名） */
export interface PageResult<T> {
  items?: T[]
  list?: T[]
  records?: T[]
  total?: number
  page?: number
  size?: number
  pageSize?: number
}

export type AdminRole = 'admin' | 'super_admin' | 'operator' | 'viewer'

/** GET /api/v1/admin/stats */
/** GET /api/v1/admin/stats 响应 —— 与 content-service/admin_router.py 实际返回对齐
 *
 * ⚠️ 2026-09-24 契约修正：旧类型里的 total_distilled 后端从未返回过，
 * 真实字段是 pending / listened / revenue（Dashboard 曾因此渲染崩溃）。
 */
export interface DashboardStats {
  total_users: number
  total_articles: number
  /** 蒸馏队列中（pending） */
  pending: number
  /** 已收听 */
  listened: number
  /** 本月已支付营收（orders 表缺失时为 0） */
  revenue: number
  active_audio_files: number
  failed_distillations_24h: number
}

/** GET /api/v1/admin/users 行 */
export interface UserRow {
  id: number
  email: string
  display_name?: string
  role?: string
  tier?: string
  status?: string
  monthly_quota?: number
  used_quota?: number
  created_at?: string
}

/** GET /api/v1/articles 行（用户端文章列表 API，admin 复用） */
export interface ArticleRow {
  id: string | number
  title: string
  status?: string
  tags?: string[] | { id: number; name: string }[]
  quality_score?: number | null
  audio_id?: string | number | null
  created_at?: string
}

/** GET /api/v1/tags 行 */
export interface TagRow {
  id: number
  /** CP-DELETE：admin 端点（/api/v1/admin/tags）返回 slug/category/is_system */
  slug?: string
  category?: string
  is_system?: boolean
  name: string
  description?: string
  subscriber_count?: number
  created_at?: string
}

/** GET /api/v1/notifications 行 */
/** GET /api/v1/admin/push-notifications 行
 *  （对齐 user-service AdminPushNotificationItem，v1 需求文档 §2.1） */
export interface PushNotificationRow {
  id: number
  user_id: number
  article_id: string | null
  tag_slug: string | null
  title: string
  body: string
  deeplink: string | null
  /** pending | sent | failed */
  status: string
  /** 失败原因（仅 failed 行有值） */
  error: string | null
  created_at: string | null
  sent_at: string | null
  read_at: string | null
}

/** POST /api/v1/admin/push-notifications/{id}/retry 响应
 *  （对齐 AdminPushNotificationRetryResponse；retry 仅 status=failed 可用） */
export interface PushNotificationRetryResult {
  id: number
  user_id: number
  status: string
  error: string | null
  sent_at: string | null
  /** 服务侧 retry 处理时间 */
  retried_at: string
}

/** GET /api/v1/admin/audit-log 行 */
export interface AuditLogRow {
  id: number
  actor_id?: number
  action_type?: string
  target_type?: string
  target_id?: string | number | null
  created_at?: string
}

/** 列表查询结果（已归一化） */
export interface ListResult<T> {
  items: T[]
  total: number
}

/** GET / PUT /api/v1/admin/llm/config 响应（api_key 只吐 set/last4） */
export interface LlmConfig {
  provider: string
  model: string
  api_key_set: boolean
  api_key_last4?: string | null
  base_url?: string | null
  /** db = system_config 表里配了；env = 回落环境变量/默认值 */
  source?: string | null
  updated_at?: string | null
}

/** GET /api/v1/admin/llm/test 响应 */
export interface LlmTestResult {
  provider: string
  model?: string | null
  text?: string | null
  ok: boolean
  error?: string | null
}

/** PUT /api/v1/admin/llm/config 请求体 —— 留空/不传的字段视作「不动」 */
export interface LlmConfigUpdatePayload {
  provider?: string
  model?: string
  api_key?: string
  base_url?: string | null
  temperature?: number | null
  max_tokens?: number | null
}

/** GET / PUT /api/v1/admin/tts/config 响应（api_key 只吐 set/last4）—— CP TTS-Config */
export interface TtsConfig {
  provider: string
  // edge
  edge_voice?: string | null
  // openai 协议
  openai_base_url?: string | null
  openai_model?: string | null
  openai_voice?: string | null
  // doubao
  doubao_voice?: string | null
  doubao_resource_id?: string | null
  // local
  local_voice?: string | null
  ffmpeg_bin?: string | null
  // indextts（oMLX /v1/audio/speech 零样本克隆）
  indextts_base_url?: string | null
  indextts_model?: string | null
  indextts_ref_audio?: string | null
  indextts_ref_text?: string | null
  api_key_set: boolean
  api_key_last4?: string | null
  /** db = system_config 表里配了；env = 回落环境变量/默认值 */
  source?: string | null
  updated_at?: string | null
}

/** GET /api/v1/admin/tts/test 响应 —— 用当前 factory client 真合成一次 */
export interface TtsTestResult {
  provider: string
  voice?: string | null
  bytes_len?: number | null
  ok: boolean
  error?: string | null
}

/** PUT /api/v1/admin/tts/config 请求体 —— 留空/不传的字段视作「不动」 */
export interface TtsConfigUpdatePayload {
  provider: string
  // edge
  edge_voice?: string | null
  // openai 协议
  openai_api_key?: string
  openai_base_url?: string | null
  openai_model?: string | null
  openai_voice?: string | null
  // doubao
  doubao_api_key?: string
  doubao_token?: string
  doubao_app_id?: string | null
  doubao_voice?: string | null
  doubao_resource_id?: string | null
  // local
  local_voice?: string | null
  ffmpeg_bin?: string | null
  // indextts
  indextts_base_url?: string | null
  indextts_model?: string | null
  indextts_ref_audio?: string | null
  indextts_ref_text?: string | null
}

/** 蒸馏 P95 响应 — GET /api/v1/admin/distill-p95 */
export interface DistillStepPercentiles {
  p50: number | null
  p95: number | null
  p99: number | null
}

export interface DistillP95Response {
  cached: boolean
  by_step: Record<string, DistillStepPercentiles>
  overall: DistillStepPercentiles
  error?: string
}

/* ====================================================================
 * CP-NEW.1 听感运营重构 —— 接口文档 §2.2（A1-A8）11 个新端点
 * 全部挂在 ai-service（8103），鉴权统一 require_admin_or_operator
 * 上线硬前提：alembic 0029 已在 PG 环境执行（evaluator_id / ab_group 列）
 * ==================================================================== */

/* ── A2 · few-shot 池 ─────────────────────────────────────────── */

/** 健康度告警档位（空池/低量时由后端填） */
export type PoolHealthWarning =
  | 'insufficient'        // 总量过低
  | 'low_high_score'      // 高分条目不足
  | 'stale'               // 陈旧条目过多
  | null

/** GET /api/v1/admin/few-shot-pool/health */
export interface PoolHealthReport {
  total_count: number
  high_score_count: number
  medium_score_count: number
  low_score_count: number
  active_count: number
  stale_count: number
  /** 0-100 健康分；前端按 <60 / 60-80 / ≥80 三档染色 */
  health_score: number
  warning: PoolHealthWarning
}

/** kind 字段——池条目类型 */
export type FewShotKind = 'hook' | 'section' | 'outro' | 'rhythm' | string

/** GET /api/v1/admin/few-shot-pool 行 */
export interface PoolExample {
  id: string
  /** null = 全局池；非空 = 私有池 */
  user_id: number | null
  kind: FewShotKind
  /** source_pattern 是 hash 摘要（不可读） */
  source_pattern: string
  /** 后端已截断到 120 字符 */
  rewrite_text: string
  score_avg: number
  usage_count: number
  last_used_at: string | null
  active: boolean
  created_at: string
}

/** GET /api/v1/admin/few-shot-pool/audit-sample 行 */
export interface PoolAuditSampleItem {
  id: string
  kind: FewShotKind
  source_pattern: string
  /** 后端已截断到 200 字符 */
  rewrite_text: string
  score_avg: number
  usage_count: number
}

/** POST /api/v1/admin/few-shot-pool/cleanup 响应 */
export interface PoolCleanupResult {
  stale: number
  low_quality: number
  duplicates: number
  total: number
}

/** POST /api/v1/admin/few-shot-pool/audit-result 响应 */
export interface PoolAuditResult {
  example_id: string
  audit_score: number
  updated: boolean
}

/* ── A3 · 评分 + 评测员标注 ──────────────────────────────────── */

/** GET /api/v1/admin/evaluations 行
 *  注意：响应不含 comment / evaluator_id（接口文档 §2.2 契约） */
export interface Evaluation {
  id: string
  task_id: string
  user_id: number | null
  hook_score: number | null
  section_score: number | null
  outro_score: number | null
  rhythm_score: number | null
  overall_score: number | null
  skip_reason: string | null
  /** false = 用户提交 / 评测员标注；true = 系统自动重蒸追踪行 */
  auto_flag: boolean
  retried_task_id: string | null
  created_at: string
}

/** POST /api/v1/admin/evaluations/{id}/annotate 请求体
 *  4 维可 null（给了必须 1-5 整数），overall 必填 */
export interface EvaluationAnnotationPayload {
  hook_score?: number | null
  section_score?: number | null
  outro_score?: number | null
  rhythm_score?: number | null
  overall_score: number
  comment?: string
}

/** POST .../annotate 响应 */
export interface EvaluationAnnotation {
  id: string
  annotates: string
  task_id: string
  evaluator_id: number
  overall_score: number
}

/** GET /api/v1/admin/evaluations/agreement */
export interface EvaluatorAgreement {
  /** 0-1 简化一致性系数；校准目标 ≥ 0.8 */
  agreement: number
  evaluator_count: number
  annotated_count: number
  task_filter: string | null
}

/* ── A1 · tier-config 模型路由 ────────────────────────────────── */

/** provider 名白名单（与 llm/factory 实际实现对齐）
 *  未实现 client 的 provider 配置进 system_config 也不会生效，
 *  GET 响应的 warnings 字段会列出 */
export type TierProvider =
  | 'openai'
  | 'qwen_vl'
  | 'claude'
  | 'deepseek'
  | 'glm'
  | string

/** tier 档位（蒸馏任务侧 ctx.target_tier） */
export type TierName = 'simple' | 'full'

/** tier → provider → model 嵌套映射 */
export type TierModelMap = Record<TierName, Record<TierProvider, string>>

/** GET /api/v1/admin/tier-config 响应（响应永不含密钥） */
export interface TierConfig {
  tier_model_map: TierModelMap
  /** "db" = system_config 表里配了；"default" = 回落代码默认 */
  source: 'db' | 'default'
  /** 代码默认（给 UI 做「恢复默认」对照） */
  default_map: TierModelMap
  /** llm/factory 实际实现 client 的 provider 列表 */
  supported_providers: TierProvider[]
  /** 已配置但未实现 client 的 provider 警告 */
  warnings: string[]
  updated_at?: string | null
}

/** PUT /api/v1/admin/tier-config 请求体（允许部分覆盖） */
export interface TierConfigUpdatePayload {
  tier_model_map: Partial<Record<TierName, Partial<Record<TierProvider, string>>>>
}

/* ── A4 · A/B 实验报表 ───────────────────────────────────────── */

/** ab_group 分组口径（intention-to-treat）
 *  user_id % 100 < 30 → personalized；其余 general
 *  0029 上线前数据 ab_group=NULL → pre_experiment */
export type ABGroupName = 'personalized' | 'general' | 'pre_experiment'

/** 报表单组数据 */
export interface ABGroup {
  group: ABGroupName
  tasks: number
  /** null = 分母为 0 时不硬算 0 */
  avg_overall_score: number | null
  eval_count: number
  play_count: number
  complete_count: number
  completion_rate: number | null
  rewatch_pairs: number
  play_pairs: number
  rewatch_rate: number | null
  skip_count: number
  skip_rate: number | null
}

/** GET /api/v1/admin/ab-report 响应
 *  caveats 是必须展示给运营的硬约束（接口文档 §2.2 契约） */
export interface ABReport {
  groups: ABGroup[]
  caveats: string[]
}

/* ── A5 · 多码率变体统计 ─────────────────────────────────────── */

/** by_bitrate 单条 */
export interface AudioVariantBitrateStat {
  bitrate: number
  count: number
  avg_file_size_bytes: number
  avg_duration_sec: number
}

/** GET /api/v1/admin/audio-variants/stats */
export interface AudioVariantsStats {
  by_bitrate: AudioVariantBitrateStat[]
  /** 有 ≥1 变体的 distinct 蒸馏数 */
  covered_articles: number
  /** done 且有 audio_url 总数（分母） */
  done_articles: number
  /** covered/done，给 CP7.4 预加载调优用 */
  coverage_ratio: number
}

/* ── A7 · GDPR 同意抽查 ──────────────────────────────────────── */

/** GET /api/v1/admin/consents 行
 *  隐私端点仅回显结构化字段，**无 comment 类自由文本** */
export interface ConsentRow {
  user_id: number
  personalization_enabled: boolean
  cross_user_share_enabled: boolean
  consent_version: string
  consent_at: string
  created_at: string
}

/* ── A8 · TTS 盲测 ───────────────────────────────────────────── */

/** POST /api/v1/admin/tts/blind-test 请求 */
export interface BlindTestSetupPayload {
  /** 1-500 字符 */
  text: string
  /** 2-6 个 provider 标识串 */
  providers: string[]
}

/** POST .../blind-test 响应
 *  samples 的 key 是匿名化标识（sample_1 / sample_2...），provider 顺序已随机隐藏 */
export interface BlindTestSetup {
  blind_test_id: string
  samples: Array<{ key: string; audio_url: string }>
  note: string
}

/** POST /api/v1/admin/tts/blind-test/{id}/submit 请求 */
export interface BlindTestSubmitPayload {
  evaluator_id: string
  scores: Array<{ sample_key: string; score: number }>
}

/** POST .../submit 响应 */
export interface BlindTestSubmit {
  blind_test_id: string
  evaluator_id: string
  accepted: boolean
}

/** GET /api/v1/admin/tts/blind-test/{id}/results 响应
 *  revealed_mapping 仅在评测全部完成后展示给运营 */
export interface BlindTestResults {
  blind_test_id: string
  evaluator_count: number
  /** provider 维度的中位分 */
  provider_median: Record<string, number>
  revealed_mapping: Record<string, string>
}
