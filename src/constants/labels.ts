/**
 * 领域枚举 → 人话。
 *
 * 数据库里存的是 `wechat_mp` / `generic_url` / `d9` 这类内部 slug，
 * 直接渲染到界面上，运营既看不懂也要靠猜。而且旧代码用固定宽度的
 * 容器截断它们，出来的是 `wecha…` / `generi…` —— 截断掉的那部分
 * 恰恰是区分度最高的部分，等于把唯一有用的信息扔了。
 */

export interface EnumLabel {
  /** 界面上显示的中文名 */
  label: string
  /** 悬浮/次要位置显示的原始值，排障时用得上 */
  raw?: string
  /** 分类色板下标；未指定时按出现顺序分配 */
  tone?: 'ochre' | 'sage' | 'stone' | 'amber' | 'slate' | 'clay'
}

/** 文章来源 —— 对应 Article.source */
export const SOURCE_LABELS: Record<string, EnumLabel> = {
  wechat_mp: { label: '微信公众号', tone: 'ochre' },
  wechat: { label: '微信公众号', tone: 'ochre' },
  weixin: { label: '微信公众号', tone: 'ochre' },
  generic_url: { label: '通用链接', tone: 'slate' },
  generic: { label: '通用链接', tone: 'slate' },
  web: { label: '网页抓取', tone: 'sage' },
  d9: { label: 'D9 每日', tone: 'amber' },
  rss: { label: 'RSS 订阅', tone: 'sage' },
  manual: { label: '后台录入', tone: 'stone' },
  admin: { label: '后台录入', tone: 'stone' },
}

/** 文章状态 —— 对应 Article.status / DistilledArticle.status */
export const ARTICLE_STATUS_LABELS: Record<string, EnumLabel> = {
  pending: { label: '待蒸馏', tone: 'amber' },
  queued: { label: '排队中', tone: 'amber' },
  distilling: { label: '蒸馏中', tone: 'amber' },
  processing: { label: '处理中', tone: 'amber' },
  ready: { label: '已就绪', tone: 'sage' },
  done: { label: '已完成', tone: 'sage' },
  completed: { label: '已完成', tone: 'sage' },
  failed: { label: '失败', tone: 'clay' },
  listened: { label: '已收听', tone: 'sage' },
  deleted: { label: '已删除', tone: 'stone' },
  suspended: { label: '已停用', tone: 'stone' },
}

/** 用户状态 */
export const USER_STATUS_LABELS: Record<string, EnumLabel> = {
  active: { label: '正常', tone: 'sage' },
  inactive: { label: '未激活', tone: 'stone' },
  suspended: { label: '已停用', tone: 'clay' },
  deleted: { label: '已注销', tone: 'stone' },
}

/** 蒸馏步骤 —— key 与后端 Prometheus label 对应 */
export const DISTILL_STEP_LABELS: Record<string, string> = {
  step1_structure: '结构提取',
  step2_rewrite: '内容改写',
  step3_tts: '语音合成',
  step4_concat: '音频拼接',
  overall: '端到端',
}

/** 分类色板 —— 与 index.css 的 --viz-cat-* 同源 */
export const TONE_BG: Record<string, string> = {
  ochre: 'bg-warm-ochre',
  sage: 'bg-[#6B8E7F]',
  stone: 'bg-neutral-400',
  amber: 'bg-[#C4956A]',
  slate: 'bg-[#7D8B93]',
  clay: 'bg-[#B87070]',
}

export const TONE_TEXT: Record<string, string> = {
  ochre: 'text-warm-ochre',
  sage: 'text-[#6B8E7F]',
  stone: 'text-neutral-400',
  amber: 'text-[#C4956A]',
  slate: 'text-[#7D8B93]',
  clay: 'text-[#B87070]',
}

/** 查不到映射时退回原始值，但至少保证不是空白 */
export function labelFor(
  map: Record<string, EnumLabel>,
  raw: string | number | null | undefined
): EnumLabel {
  if (raw === null || raw === undefined || raw === '') return { label: '—' }
  return map[String(raw)] ?? { label: String(raw), raw: String(raw) }
}

/* ── 杂项状态值 ────────────────────────────────────────────────── */

/** 通用开关态 —— Consents 页的「个性化改写 / 跨用户共享」等 */
export const TOGGLE_LABELS: Record<string, EnumLabel> = {
  enabled: { label: '已开启', tone: 'sage' },
  disabled: { label: '已关闭', tone: 'stone' },
  on: { label: '已开启', tone: 'sage' },
  off: { label: '已关闭', tone: 'stone' },
}

/** 听感池条目类型 —— few_shot_examples.kind */
export const POOL_KIND_LABELS: Record<string, EnumLabel> = {
  hook: { label: '开场钩子', tone: 'ochre' },
  section: { label: '段落组织', tone: 'sage' },
  outro: { label: '收尾', tone: 'slate' },
  rhythm: { label: '节奏', tone: 'amber' },
  tone: { label: '语气', tone: 'clay' },
}

/** 合成 / 任务结果。`failed` 属于歧义词，只能在合成场景显式用。 */
export const RESULT_LABELS: Record<string, EnumLabel> = {
  ok: { label: '成功', tone: 'sage' },
  success: { label: '成功', tone: 'sage' },
  failed: { label: '失败', tone: 'clay' },
  error: { label: '报错', tone: 'clay' },
}

/** 只有 ok / success 是全站无歧义的，可以进默认表 */
const RESULT_LABELS_OK: Record<string, EnumLabel> = {
  ok: RESULT_LABELS.ok,
  success: RESULT_LABELS.success,
}

/** 推送队列状态 */
export const PUSH_STATUS_LABELS: Record<string, EnumLabel> = {
  pending: { label: '待发送', tone: 'amber' },
  queued: { label: '排队中', tone: 'amber' },
  sent: { label: '已发送', tone: 'sage' },
  failed: { label: '发送失败', tone: 'clay' },
  cancelled: { label: '已取消', tone: 'stone' },
}

/**
 * Badge 的默认查找表。
 *
 * 这里**只放没有领域歧义的词**。
 *
 * 踩过的坑：`active` / `failed` / `pending` / `done` 在用户、文章、推送、
 * 听感池四个域里含义各不相同（用户 active=正常，推送 active=已发送…）。
 * 把各域映射平铺合并成一个默认表时，后展开的那张会静默覆盖先展开的 ——
 * 症状是某个页面的「失败」忽然显示成「发送失败」，而且没有任何报错。
 * 已经在这个坑上翻车两次，所以默认表只收真正全局唯一的值，
 * 有歧义的由调用点显式传 map。
 */
export const DEFAULT_BADGE_LABELS: Record<string, EnumLabel> = {
  ...TOGGLE_LABELS, // enabled / disabled —— 开关语义，全站一致
  ...POOL_KIND_LABELS, // hook / section / outro / rhythm —— 仅听感池使用
  ...RESULT_LABELS_OK, // ok —— 全站一致
}

/**
 * 听感池条目启用态。
 *
 * 刻意**不**并进 DEFAULT_BADGE_LABELS：`active` 在用户上下文里是「正常」，
 * 在池条目上下文里是「启用」——两个都叫 active，含义不同。合并成一张平表
 * 必然有一个被悄悄冲掉（这里被冲掉的就是用户状态那一侧）。
 * 需要不同含义的页面自己传 map。
 */
export const POOL_ACTIVE_LABELS: Record<string, EnumLabel> = {
  active: { label: '启用', tone: 'sage' },
  inactive: { label: '停用', tone: 'stone' },
}
