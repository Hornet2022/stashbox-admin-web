import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'

/**
 * 全局键盘快捷键（0 依赖手写）。
 *
 * 序列键：
 *   g d → /dashboard          g u → /users
 *   g t → /tags               g a → /articles
 *   g p → /push-notifications g l → /audit-log
 * 单键：
 *   ?   → 切换快捷键帮助弹窗
 *   Esc → 关闭帮助弹窗
 *
 * 在输入框 / 文本域 / 下拉框里打字时不会触发（避免抢输入）。
 *
 * 帮助弹窗状态放在 Zustand 而不是 useState，这样 Header 的 “? 快捷键”
 * 按钮和 App 顶层的弹窗共享同一份状态，且键盘监听只注册一次
 * （useShortcuts 只在 App 顶层调用一次）。
 */

/** 帮助弹窗展示用清单 */
export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'g d', label: '总览' },
  { keys: 'g u', label: '用户管理' },
  { keys: 'g t', label: '标签管理' },
  { keys: 'g a', label: '文章管理' },
  { keys: 'g p', label: '推送队列' },
  { keys: 'g l', label: '审计日志' },
  { keys: '?', label: '显示 / 隐藏本帮助' },
  { keys: 'Esc', label: '关闭弹窗' },
]

/** 第二键 → 路由 */
const GO_ROUTES: Record<string, string> = {
  d: '/dashboard',
  u: '/users',
  t: '/tags',
  a: '/articles',
  p: '/push-notifications',
  l: '/audit-log',
}

/** 等待第二个键的超时（ms） */
const SEQUENCE_TIMEOUT = 1200

interface HelpState {
  helpOpen: boolean
  openHelp: () => void
  closeHelp: () => void
  toggleHelp: () => void
}

export const useShortcutsHelp = create<HelpState>((set, get) => ({
  helpOpen: false,
  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),
  toggleHelp: () => set({ helpOpen: !get().helpOpen }),
}))

/** 判断焦点是否在可输入元素上 */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  const tag = el.tagName.toUpperCase()
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable === true
  )
}

/**
 * 注册全局键盘监听 —— 只在 App 顶层调用一次。
 */
export function useShortcuts(): void {
  const navigate = useNavigate()

  useEffect(() => {
    let pendingG = false
    let timer: number | null = null

    const clearPending = () => {
      pendingG = false
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      // 组合键留给浏览器 / 系统
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === 'Escape') {
        useShortcutsHelp.getState().closeHelp()
        return
      }

      if (isTypingTarget(event.target)) return

      if (event.key === '?') {
        event.preventDefault()
        useShortcutsHelp.getState().toggleHelp()
        return
      }

      // 处于 g 序列中：当前按键是第二个键
      if (pendingG) {
        clearPending()
        const route = GO_ROUTES[event.key.toLowerCase()]
        if (route) {
          event.preventDefault()
          navigate(route)
        }
        return
      }

      if (event.key === 'g' || event.key === 'G') {
        pendingG = true
        timer = window.setTimeout(clearPending, SEQUENCE_TIMEOUT)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearPending()
    }
  }, [navigate])
}

export default useShortcuts
