/**
 * e2e 里「直调接口」的网关地址 —— 所有 spec 共用这一个来源。
 *
 * ⚠️ 为什么必须集中：历史上这里散落着 6 处
 * `process.env.STASHBOX_GATEWAY ?? 'http://127.0.0.1:8100'`
 * （voice-library 1 处 + cross-device 5 处）。而 `page.request` 直调**不经过
 * 前端 axios**，也就绕开了 `VITE_API_BASE_URL` —— 于是同一轮测试里，
 * UI 操作进了隔离库、校验用的直调却打进生产库。实测一次运行同时出现
 * 「e2e-voice-36028 进了 stashbox_e2e」和「38066/46325 进了生产 stashbox」，
 * 而测试因为两边都返回 200 照常报绿。
 *
 * 前端走 VITE_API_BASE_URL（构建期注入），直调走这里（运行期读 env），
 * 两者必须指向同一个后端 —— 所以默认值和 playwright.config.ts 保持一致。
 */

const raw = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:18100'

// 防呆：e2e 打生产端口一律当场报错。这条路已经踩了三次（8100 污染生产库），
// 静默的默认值比没有默认值危险得多。
const port = (() => {
  try {
    return new URL(raw).port
  } catch {
    throw new Error(`E2E_API_BASE_URL 不是合法 URL: ${raw}`)
  }
})()

if (port === '8100' || port === '8101' || port === '8102' || port === '8103') {
  throw new Error(
    `E2E_API_BASE_URL 指向生产端口 ${port}（${raw}）—— e2e 绝不允许打生产。\n` +
      `  · 先起隔离后端：pnpm e2e:backend（stashbox_e2e 库 / :18100-18103）\n` +
      `  · 或显式指定：E2E_API_BASE_URL=http://127.0.0.1:18100 pnpm e2e`,
  )
}

export const GATEWAY = raw
