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
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6 dark:bg-slate-950">
        <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            出错了
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            页面渲染时发生异常，已阻止白屏。可尝试重新渲染或回到总览页。
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-red-400">
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
