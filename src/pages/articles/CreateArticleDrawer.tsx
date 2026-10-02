import { useRef, type FormEvent } from 'react'
import { Drawer } from 'vaul'
import { Field, buttonGhostClass, buttonPrimaryClass, inputClass } from '../../components/ui'

/**
 * 新建文章 Drawer（vaul 抽屉，从右侧滑入）。
 *
 * - URL 必填，错误时触发 error-shake 动效（复用 index.css 的 .t-input-wrap.is-error / .t-input.is-shaking）
 * - 标题 / 标签可选
 * - 成功后展示 success-check 动效，700ms 后自动关闭
 */
export interface CreateArticleDrawerProps {
  open: boolean
  url: string
  title: string
  submitting: boolean
  error: string | null
  showSuccess: boolean
  onClose: () => void
  onUrlChange: (v: string) => void
  onTitleChange: (v: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export function CreateArticleDrawer({
  open,
  url,
  title,
  submitting,
  error,
  showSuccess,
  onClose,
  onUrlChange,
  onTitleChange,
  onSubmit,
}: CreateArticleDrawerProps) {
  const urlRef = useRef<HTMLInputElement>(null)

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
              <p className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                {error}
              </p>
            )}

            {showSuccess ? (
              <div className="flex items-center justify-center gap-2 py-6">
                <span
                  className="t-success-check text-emerald-500"
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
                <span className="text-sm font-medium text-success">文章已创建</span>
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