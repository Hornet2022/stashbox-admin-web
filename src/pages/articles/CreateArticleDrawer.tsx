import { useRef, type ChangeEvent, type FormEvent } from 'react'
import { Drawer } from 'vaul'
import {
  Field,
  SlidingTabs,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
} from '../../components/ui'

/**
 * 新建文章 Drawer（vaul 抽屉，从右侧滑入）。
 *
 * - URL 必填，错误时触发 error-shake 动效（复用 index.css 的 .t-input-wrap.is-error / .t-input.is-shaking）
 * - 标题 / 标签可选
 * - 成功后展示 success-check 动效，700ms 后自动关闭
 *
 * ## 三种录入方式（2026-10-23 加了文档）
 *
 * `链接` / `上传文件` / `粘贴文本` 三选一：
 *
 * · **链接** —— 运营贴一个 URL，服务端去抓（原有行为，不变）；
 * · **上传文件** —— 运营直接给一份文档，服务端解析后入库；
 * · **粘贴文本** —— 同上，但正文由运营直接粘。
 *
 * 为什么不做成「链接输入框 + 下面再来个文件框」：
 * 那会让「填了 URL 又选了文件」这种自相矛盾的输入**合法** ——
 * 服务端只能替用户猜一个，而猜错时用户完全不知道被猜了什么。
 * 做成三选一的分段控件，输入互斥是**结构上**保证的。
 *
 * ## 上传大小上限
 *
 * 服务端 10MB（与 nginx `client_max_body_size 10m` 同口径）。
 * 这里**也**先挡一道：让运营传 50MB 才撞网关的 413（那种报错没有信息量），
 * 不如在选完文件就告诉他「太大了」。
 */

/** 三种录入方式。 */
export type CreateMode = 'url' | 'file' | 'text'

/** 与服务端 `MAX_DOCUMENT_BYTES` 同口径（10MB）。 */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

/** 服务端支持的扩展名（文件选择器的 accept 属性）。 */
export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  'pdf',
  'md',
  'markdown',
  'txt',
  'text',
  'rst',
  'log',
  'csv',
  'json',
  'yaml',
  'yml',
  'html',
  'htm',
  'xhtml',
  'docx',
]

export interface CreateArticleDrawerProps {
  open: boolean
  mode: CreateMode
  url: string
  title: string
  file: File | null
  text: string
  submitting: boolean
  error: string | null
  showSuccess: boolean
  onClose: () => void
  onModeChange: (m: CreateMode) => void
  onUrlChange: (v: string) => void
  onTitleChange: (v: string) => void
  onFileChange: (f: File | null) => void
  onTextChange: (v: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

const MODE_ITEMS: { key: CreateMode; label: string }[] = [
  { key: 'url', label: '链接' },
  { key: 'file', label: '上传文件' },
  { key: 'text', label: '粘贴文本' },
]

export function CreateArticleDrawer({
  open,
  mode,
  url,
  title,
  file,
  text,
  submitting,
  error,
  showSuccess,
  onClose,
  onModeChange,
  onUrlChange,
  onTitleChange,
  onFileChange,
  onTextChange,
  onSubmit,
}: CreateArticleDrawerProps) {
  const urlRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUrlChange = (value: string) => {
    onUrlChange(value)
    // 输入框有内容时立即清掉 error 态
    const wrap = urlRef.current?.closest('.t-input-wrap') as HTMLElement | null
    if (wrap?.classList.contains('is-error') && value.trim()) {
      const revertKey = 'data-revert-timer'
      const existing = wrap.getAttribute(revertKey)
      if (existing) clearTimeout(Number(existing))
      wrap.classList.remove('is-error')
      urlRef.current?.classList.remove('is-error')
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null
    onFileChange(picked)
    // 允许重复选同一个文件：清掉 value，否则第二次 onChange 不会触发。
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-lg flex-col bg-neutral-50 outline-none dark:bg-neutral-800 sm:w-[32rem]">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
            <Drawer.Title className="font-serif text-base font-semibold text-ink dark:text-neutral-100">
              新建文章
            </Drawer.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200"
              aria-label="关闭"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>
          <form
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
            onSubmit={onSubmit}
          >
            <SlidingTabs
              items={MODE_ITEMS}
              active={mode}
              onChange={(k) => onModeChange(k)}
            />

            {mode === 'url' && (
              <Field label="URL *">
                <div className="t-input-wrap">
                  <input
                    ref={urlRef}
                    type="url"
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://..."
                    className={`t-input ${inputClass}`}
                  />
                </div>
              </Field>
            )}

            {mode === 'file' && (
              <Field label="文档文件 *">
                <div className="t-input-wrap">
                  <input
                    ref={fileRef}
                    type="file"
                    accept={SUPPORTED_DOCUMENT_EXTENSIONS.map((e) => `.${e}`).join(',')}
                    onChange={handleFileChange}
                    aria-label="选择文档文件"
                    className={`t-input ${inputClass} py-1.5 file:mr-3 file:rounded file:border-0 file:bg-neutral-200 file:px-2 file:py-1 file:text-xs dark:file:bg-neutral-700`}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                  支持 PDF / Markdown / 纯文本 / HTML / DOCX，单个 ≤ 10MB。
                  {file ? `已选：${file.name}` : '尚未选择文件。'}
                </p>
              </Field>
            )}

            {mode === 'text' && (
              <Field label="正文 *">
                <textarea
                  value={text}
                  onChange={(e) => onTextChange(e.target.value)}
                  placeholder="把文章正文粘到这里…"
                  rows={10}
                  aria-label="粘贴正文"
                  className={`t-input ${inputClass} resize-y font-mono text-xs leading-relaxed`}
                />
                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                  与「上传文件」走同一条服务端解析路径（判据完全一致）。
                </p>
              </Field>
            )}

            <Field label="标题（可选）">
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="文章标题"
                className={inputClass}
              />
            </Field>
            {error && (
              <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm dark:border-error/40 dark:bg-error/10 dark:text-[#E0A0A0]">
                {error}
              </p>
            )}

            {showSuccess ? (
              <div className="flex items-center justify-center gap-2 py-6">
                <span
                  className="t-success-check text-success-ink"
                  data-state="in"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 48 48"
                    width="40"
                    height="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 25 L20 35 L38 14" />
                  </svg>
                </span>
                <span className="text-sm font-medium text-success-ink">文章已创建</span>
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  className={buttonGhostClass}
                  onClick={onClose}
                  aria-label="取消新建"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={buttonPrimaryClass}
                  disabled={submitting}
                  aria-label="确认创建文章"
                >
                  {submitting ? '提交中…' : '创建'}
                </button>
              </div>
            )}
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
