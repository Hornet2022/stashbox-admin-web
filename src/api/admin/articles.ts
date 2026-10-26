import { apiClient } from '../client'
import { normalizeList, type ListResult } from './_shared'
import type { ArticleRow } from '../../types'

/**
 * 文章管理端点 —— GET /admin/articles + 4 个 admin 写动作。
 *
 * CP-NEW.15 从老 api/admin.ts 拆出；2026-09-24 回归修正：
 * 拆分时曾把 4 个路径臆写成非 admin 形态（listArticles 丢了 /admin 段、
 * invalidate 用了复数 audios、delete/force-retry 走了用户侧前缀），
 * 现已逐字对齐老文件与网关 ROUTES 注册。
 */

export async function listArticles(params: {
  limit?: number
  offset?: number
  status?: string
  tag?: string
} = {}): Promise<ListResult<ArticleRow>> {
  // 参数名必须是 limit/offset —— 后端 admin_list_articles 的签名就是这两个。
  // 原先这里发 page/size，而 FastAPI 会**静默丢弃**未知 query 参数：
  // 结果永远返回第一页，页脚却照常打印真实 total（"共 312 条"只给 50 条），
  // 看起来一切正常。scripts/check-endpoint-contract.py 现在会比对参数名，
  // 这类漂移会被拦在提交前。
  const { data } = await apiClient.get('/api/v1/admin/articles', { params })
  return normalizeList<ArticleRow>(data)
}

/**
 * 运营手动录入文章。
 *
 * 走 `/api/v1/admin/articles` 而不是用户侧的 `/api/v1/articles`：
 * 后者是剪藏入口，用 admin token 打过去会**扣运营账号自己的配额**，
 * 并把文章 owner 设成运营本人 —— 运营想造的是全站公共内容，
 * 产出的却是挂在个人名下、用户侧只有自己看得见的私有文章。
 *
 * title 之前也是白填的：`AddArticleRequest` 压根没声明 title 字段，
 * Pydantic 静默忽略未声明字段，运营看到「创建成功」但库里没有标题。
 * 现在 schema 补上了（optional，老客户端行为不变）。
 */
/**
 * 运营手动录入文章。
 *
 * `tags` = **运营指定的分类**（中文标签名，如 "科技"）。
 *
 * ⚠️ 2026-10-24 产品拍板后新增：运营录入的内容**只靠订阅分发**
 * （「订阅了分类就可以看到，没订阅就看不到」），所以分类必须**可靠** ——
 * 而原先分类只有一条来源：蒸馏时 LLM 猜的。实测 GitHub 开源库的稿子
 * tags 就是**空的**（代码库主题大概率不在候选里）⇒ 没有分类 = 永远进不了
 * 任何人的订阅流 = **死内容**，而且没有任何报错。
 *
 * ⇒ 运营可以在这里指定分类；服务端优先用运营指定的（`articles.manual_tags`）。
 * 不传 = 沿用 LLM 猜的（老行为不变）。
 */
/**
 * @returns 服务端返回的 `warning`（可能为 null）。它是**非阻塞**的提醒 ——
 *   录入本身已成功，但结果里带运营该知道的事（如：这篇文章此前已被蒸馏过，
 *   改分类不会生效，需重新蒸馏才换分类）。调用方应把它展示给运营，
 *   而不是当成错误吞掉。
 */
export async function createArticle(
  url: string,
  title?: string,
  tags?: string[],
): Promise<string | null> {
  const { data } = await apiClient.post('/api/v1/admin/articles', {
    url,
    title,
    tags: tags && tags.length ? tags : undefined,
  },
  // ⚠️ 必须单独放宽：这条路径的抓取在**服务端同步完成**
  // （`_prefetch_for_capture` → `fetcher.fetch(budget=30s)`），不是「收下 URL 立刻返回」。
  // 剪藏整条降级链最坏 ~40.6s（实测），而 axios 全局 timeout 只有 15s
  // ⇒ 运营点「发布」大概率超时，但服务端其实已经把文章建好了 ——
  // 运营看到红字就再点一次，于是库里多一条重复文章。
  //
  // 60s 与网关的 STASHBOX_GATEWAY_UPSTREAM_TIMEOUT（默认 60）对齐：
  // 客户端比网关还短的话，超时文案（"可能已提交"）根本没机会发出来。
  { timeout: 60_000 })
  return data?.warning ?? null
}

/**
 * 运营手动录入**文档**（上传文件或粘贴文本）。
 *
 * 走 `/api/v1/admin/articles/document` 而不是用户侧的 `/api/v1/articles/document`：
 * 后者是用户剪藏入口，会扣**运营账号自己的**配额，并把文章 owner 设成运营本人 ——
 * 运营想造的是全站公共内容，产出的却是挂在个人名下、用户侧看不见的私有文章。
 *
 * ## ⚠️ 必须显式覆盖 Content-Type
 *
 * axios 实例默认带 `Content-Type: application/json`（见 client.ts）。
 * 而 axios 的 `transformRequest` 里有一段：
 *
 *     if (isFormData) {
 *       return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data
 *     }
 *
 * `hasJSONContentType` 为真时，**FormData 会被转成 JSON**（File 变成 `{}`），
 * 服务端收到的是一份没有文件的 JSON —— 而且**不报错**。
 * （`resolveConfig` 里那句「浏览器自己设 Content-Type」发生在 adapter 里，
 * 晚于 transformRequest，救不了这一步。）
 *
 * 所以这里显式给 `multipart/form-data`：让 `hasJSONContentType` 为假，
 * FormData 原样发出；随后 adapter 会把它删掉、由浏览器补上带 boundary 的头。
 */
/**
 * @returns 服务端返回的 `warning`（可能为 null），语义同 `createArticle`。
 */
export async function createArticleFromDocument(
  file: File | null,
  text: string | null,
  title?: string,
  tags?: string[],
): Promise<string | null> {
  const form = new FormData()
  if (file) {
    form.append('file', file, file.name)
  }
  if (text && text.trim() !== '') {
    form.append('text', text)
  }
  if (title && title.trim() !== '') {
    form.append('title', title.trim())
  }
  // 分类：multipart 里**重复字段**（tags=科技&tags=财经）
  // ⇒ 服务端的 `tags: list[str] = Form(...)` 收得到。
  if (tags) {
    for (const t of tags) {
      if (t.trim()) form.append('tags', t.trim())
    }
  }
  return await apiClient.post('/api/v1/admin/articles/document', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // 上传 10MB 文件 + 服务端解析，15s 的全局超时偏紧（见 client.ts 的 timeout）。
    timeout: 120000,
  }).then((res) => res.data?.warning ?? null)
}

export async function forceRetryArticle(
  articleId: string | number,
  reason: string,
): Promise<void> {
  await apiClient.post(`/api/v1/admin/articles/${articleId}/force-retry`, { reason })
}

export async function invalidateAudio(
  audioId: string | number,
  reason: string,
): Promise<void> {
  await apiClient.post(`/api/v1/admin/audio/${audioId}/invalidate`, { reason })
}

export async function deleteAdminArticle(
  articleId: string | number,
  reason: string,
): Promise<void> {
  await apiClient.delete(`/api/v1/admin/articles/${articleId}`, { data: { reason } })
}