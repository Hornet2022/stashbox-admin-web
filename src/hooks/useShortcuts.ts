import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'

/**
 * 全局键盘快捷键（0 依赖手写）。
 *
 * 序列键（CP-NEW.9 扩为 13 个，覆盖全部后台路由）：
 *   g d → /dashboard           g u → /users
 *   g m → /distill-metrics     g t → /tags
 *   g a → /articles            g p → /push-notifications
 *   g l → /audit-log           g f → /few-shot-pool
 *   g e → /evaluations         g r → /model-routing
 *   g b → /tts-blind-test      g x → /ab-report
 *   g v → /audio-variants      g c → /consents
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

/** 帮助弹窗展示用清单（按 group 排序） */
export interface ShortcutEntry {
  keys: string
  label: string
  group?: string
}

/** 不带 group 的为通用（"?" / "Esc"），放在最底部不分组 */
export const SHORTCUTS: ShortcutEntry[] = [
  // 总览
  { keys: 'g d', label: '总览（Dashboard）', group: '总览' },
  { keys: 'g m', label: '蒸馏耗时', group: '总览' },
  // 内容运营
  { keys: 'g a', label: '文章管理', group: '内容运营' },
  { keys: 'g t', label: '标签管理', group: '内容运营' },
  { keys: 'g p', label: '推送队列', group: '内容运营' },
  // 用户与系统
  { keys: 'g u', label: '用户管理', group: '用户与系统' },
  { keys: 'g l', label: '审计日志', group: '用户与系统' },
  // 听感运营（CP-NEW.1 起的 7 个新路由）
  { keys: 'g f', label: '听感池', group: '听感运营' },
  { keys: 'g e', label: '评测标注', group: '听感运营' },
  { keys: 'g r', label: '模型路由', group: '听感运营' },
  { keys: 'g b', label: 'TTS 盲测', group: '听感运营' },
  { keys: 'g v', label: '多码率统计', group: '听感运营' },
  { keys: 'g c', label: 'GDPR 同意', group: '听感运营' },
  { keys: 'g x', label: 'A/B 报表', group: '听感运营' },
  // 帮助（无 group）
  { keys: '?', label: '显示 / 隐藏本帮助' },
  { keys: 'Esc', label: '关闭弹窗' },
]

/** 第二键 → 路由（与 SHORTCUTS keys 一一对应） */
const GO_ROUTES: Record<string, string> = {
  d: '/dashboard',
  m: '/distill-metrics',
  a: '/articles',
  t: '/tags',
  p: '/push-notifications',
  u: '/users',
  l: '/audit-log',
  f: '/few-shot-pool',
  e: '/evaluations',
  r: '/model-routing',
  b: '/tts-blind-test',
  v: '/audio-variants',
  c: '/consents',
  x: '/ab-report',
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
