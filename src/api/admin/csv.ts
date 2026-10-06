import { API_BASE_URL, ADMIN_API_PREFIX, getAuthToken } from '../client'
import { toErrorMessage } from '../client'

/**
 * CSV 导出 —— GET /admin/export/{kind}.csv。
 *
 * 原来这里是 `window.location.href = url` + `?token=`，实测**导出功能整个是坏的**：
 * 后端只认 `Authorization: Bearer` 头，不认查询参数（实测带 ?token= 返 401，
 * 带头返 200）。而 `location.href` 是一次整页导航 —— 点「导出 CSV」会先把
 * 浏览器带到接口地址，拿到 401 的裸 JSON 页（带个 Pretty-print 勾选框），
 * 运营的会话页面就没了。4 个页面的导出按钮全是这条路径。
 *
 * 改成 fetch + blob 下载：带正确的头、留在应用内、能弹成功/失败提示。
 */

export type ExportKind =
  | 'users'
  | 'articles'
  | 'tags'
  | 'audit-log'
  | 'feedback'

const KIND_LABEL: Record<ExportKind, string> = {
  users: '用户',
  articles: '文章',
  tags: '标签',
  'audit-log': '审计日志',
  feedback: '用户反馈',
}

export function exportCsvUrl(kind: ExportKind): string {
  return `${API_BASE_URL}${ADMIN_API_PREFIX}/export/${kind}.csv`
}

function fileNameFor(kind: ExportKind): string {
  const d = new Date()
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('')
  return `${KIND_LABEL[kind]}-${stamp}.csv`
}

/**
 * 触发 CSV 下载。
 *
 * 返回实际使用的 URL（测试可断言）。失败时抛错，由调用方决定怎么提示 ——
 * 这里不静默吞掉：导出失败运营必须知道，否则会以为导出了空文件。
 */
export async function downloadCsv(kind: ExportKind): Promise<string> {
  const url = exportCsvUrl(kind)
  const token = getAuthToken()

  const res = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    // 后端错误体是 JSON，但下载场景不该把 JSON 塞给运营看，
    // 统一转成一句人话，细节留在 console。
    const raw = await res.text().catch(() => '')
    let detail = ''
    try {
      const parsed = JSON.parse(raw) as { message?: string }
      detail = parsed.message ?? ''
    } catch {
      detail = ''
    }
    console.warn(`[export] ${kind} 导出失败 ${res.status}`, detail || raw.slice(0, 200))
    throw new Error(detail || `导出失败（HTTP ${res.status}）`)
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = fileNameFor(kind)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 不 revoke 的话 blob 会一直挂在内存里直到页面关闭；给浏览器一拍时间
  // 完成下载再释放。
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  return url
}

/** 把 downloadCsv 的错误转成可直接展示的文案（复用 api 层的归一化）。 */
export function exportErrorMessage(err: unknown): string {
  return toErrorMessage(err)
}
