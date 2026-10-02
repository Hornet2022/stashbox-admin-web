import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Drawer } from 'vaul'
import { Layout } from './components/Layout'
import { AuthGuard } from './components/AuthGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastContainer } from './components/Toast'
import { Skeleton } from './components/ui'
import { SHORTCUTS, useShortcuts, useShortcutsHelp } from './hooks/useShortcuts'
import { Login } from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Users = lazy(() => import('./pages/Users'))
const Tags = lazy(() => import('./pages/Tags'))
const Articles = lazy(() => import('./pages/Articles'))
const PushNotifications = lazy(() => import('./pages/PushNotifications'))
const AuditLog = lazy(() => import('./pages/AuditLog'))
const LlmSettings = lazy(() => import('./pages/LlmSettings'))
const TtsSettings = lazy(() => import('./pages/TtsSettings'))
const VoiceLibrary = lazy(() => import('./pages/VoiceLibrary')) // CP-TTS-VOICE 音色库
const DistillMetrics = lazy(() => import('./pages/DistillMetrics'))

// CP-NEW.1：听感运营 7 个 stub 路由（CP-NEW.2~5 承接业务实现）
const FewShotPool = lazy(() => import('./pages/FewShotPool'))
const Evaluations = lazy(() => import('./pages/Evaluations'))
const ModelRouting = lazy(() => import('./pages/ModelRouting'))
const TtsBlindTest = lazy(() => import('./pages/TtsBlindTest'))
const AbReport = lazy(() => import('./pages/AbReport'))
const AudioVariants = lazy(() => import('./pages/AudioVariants'))
const Consents = lazy(() => import('./pages/Consents'))

/**
 * Route-level loading fallback
 *
 * 2026-10-03：改用仓库自己的 Skeleton 原语。
 * 原来这里是本地的一组 `bg-gray-200 dark:bg-slate-700` —— 于是这个 App
 * 同时存在两套骨架屏颜色，而 Skeleton 原语是 `bg-neutral-200 dark:bg-neutral-700`。
 * gray-200 是 #E5E7EB，偏蓝的冷灰，压在米白 #F5F2EB 上色相是跳的。
 * 15 个页面全是 lazy()，也就是说**每次冷切路由都会闪一下冷灰** ——
 * 这是整个产品里出现频次最高的一帧。
 */
function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  )
}

/**
 * 快捷键层 —— 注册全局键盘监听 + 渲染 "?" 帮助抽屉。
 *
 * 必须在 BrowserRouter 内部（useShortcuts 依赖 useNavigate）。
 */
function ShortcutsLayer() {
  useShortcuts()
  const helpOpen = useShortcutsHelp((s) => s.helpOpen)
  const closeHelp = useShortcutsHelp((s) => s.closeHelp)

  return (
    <Drawer.Root open={helpOpen} onOpenChange={(open) => !open && closeHelp()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 right-0 top-auto z-50 flex flex-col rounded-t-xl bg-neutral-50 dark:bg-neutral-800 outline-none">
          <div className="mx-auto w-full max-w-sm">
            <Drawer.Handle className="mx-auto mt-3 h-1 w-12 flex-shrink-0 cursor-grab rounded-full bg-neutral-300 dark:bg-neutral-600" />
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
              <Drawer.Title className="text-base font-semibold text-ink dark:text-neutral-100">
                键盘快捷键
              </Drawer.Title>
              <button
                type="button"
                onClick={closeHelp}
                className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm divide-y divide-neutral-100 px-5 py-2 dark:divide-neutral-700">
            {(() => {
              // 按 group 聚合，未分组的（"?" / "Esc"）放在最末尾
              const grouped = SHORTCUTS.reduce(
                (acc, item) => {
                  const g = item.group ?? '\0'
                  if (!acc[g]) acc[g] = []
                  acc[g].push(item)
                  return acc
                },
                {} as Record<string, typeof SHORTCUTS>,
              )
              const groupKeys = Object.keys(grouped).filter((k) => k !== '\0')
              const ungrouped = grouped['\0'] ?? []

              return (
                <>
                  {groupKeys.map((g) => (
                    <div key={g} className="py-2 first:pt-0">
                      {/* uppercase + tracking 打在中文上，两件事都不该做：
   uppercase 对汉字是空操作；正字距在汉字上是排版错误 —— 汉字设计时
   就占满一个 em 字身框，字间塞空会破坏阅读节奏，短标签看着像撑开的
   占位符。分组层级靠字号、字重和颜色来分，不靠字距。 */}
                      <div className="mb-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                        {g}
                      </div>
                      <ul>
                        {grouped[g].map((item) => (
                          <li
                            key={item.keys}
                            className="flex items-center justify-between py-1.5"
                          >
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">
                              {item.label}
                            </span>
                            <kbd className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200">
                              {item.keys}
                            </kbd>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {ungrouped.length > 0 && (
                    <ul className="pt-2">
                      {ungrouped.map((item) => (
                        <li
                          key={item.keys}
                          className="flex items-center justify-between py-1.5"
                        >
                          <span className="text-sm text-neutral-600 dark:text-neutral-300">
                            {item.label}
                          </span>
                          <kbd className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200">
                            {item.keys}
                          </kbd>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )
            })()}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ShortcutsLayer />
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <Dashboard />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="users"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <Users />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="tags"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <Tags />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="articles"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <Articles />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="push-notifications"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <PushNotifications />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="audit-log"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <AuditLog />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="distill-metrics"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <DistillMetrics />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="settings/llm"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <LlmSettings />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="settings/tts"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <TtsSettings />
                  </Suspense>
                </AuthGuard>
              }
            />
            {/* CP-TTS-VOICE：音色库。与 TTS 配置页分开 —— 后者配 provider 凭证，
                前者管「有哪些音色可选」，用户侧的音色选择器读的就是这张表。 */}
            <Route
              path="settings/voices"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <VoiceLibrary />
                  </Suspense>
                </AuthGuard>
              }
            />
            {/* CP-NEW.1：听感运营 7 个 stub 路由，CP-NEW.2~5 承接业务实现 */}
            <Route
              path="few-shot-pool"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <FewShotPool />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="evaluations"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <Evaluations />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="model-routing"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <ModelRouting />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="tts-blind-test"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <TtsBlindTest />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="ab-report"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <AbReport />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="audio-variants"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <AudioVariants />
                  </Suspense>
                </AuthGuard>
              }
            />
            <Route
              path="consents"
              element={
                <AuthGuard>
                  <Suspense fallback={<PageSkeleton />}>
                    <Consents />
                  </Suspense>
                </AuthGuard>
              }
            />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
