import { Component, type ErrorInfo, type ReactNode } from 'react'
import { buttonGhostClass, buttonPrimaryClass } from './ui'

/**
 * 全局错误边界 —— 渲染期异常兜底，避免整页白屏。
 *
 * React 只支持 class 组件做错误边界，这里包住 App 的 Routes。
 */

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[admin-web] 渲染异常:', error, info.componentStack)
  }

  /** 重置边界并回到总览页 */
  handleReset = () => {
    this.setState({ error: null })
    if (window.location.pathname !== '/dashboard') {
      window.location.assign('/dashboard')
    }
  }

  /** 仅清错误、原地重渲染（用于偶发的瞬时异常） */
  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      // 2026-10-03：整屏从 gray/slate 换成 neutral 暖中性刻度。
      // 原来这是全 App 唯一一块纯 Tailwind 灰的整页面：灰底 + 纯白卡片，
      // 而里面放的两个按钮是 buttonGhostClass / buttonPrimaryClass ——
      // 也就是**米白底上的墨色品牌按钮，被塞进一张冷白灰卡片里**。
      // 而且它恰好出现在用户最不愿看到故障的时刻。
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-6 dark:bg-neutral-900">
        <div className="w-full max-w-lg rounded-lg border border-neutral-200 bg-neutral-50 p-8 shadow dark:border-neutral-700 dark:bg-neutral-800">
          <h1 className="font-serif text-xl font-semibold text-ink dark:text-neutral-100">
            出错了
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            页面渲染时发生异常，已阻止白屏。可尝试重新渲染或回到总览页。
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded border border-neutral-200 bg-neutral-100 p-3 text-xs text-error-ink dark:border-neutral-700 dark:bg-neutral-900 dark:text-[#E0A0A0]">
            {error.message || String(error)}
          </pre>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={buttonGhostClass} onClick={this.handleRetry}>
              重试
            </button>
            <button
              type="button"
              className={buttonPrimaryClass}
              onClick={this.handleReset}
            >
              重置并返回总览
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
