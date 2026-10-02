/**
 * 视觉基线截图 —— 给 UI 迭代用。
 *
 * 打哪套后端由 SHOOT_WEB 决定（默认 vite dev server 所在地址）。
 *
 * ⚠️ 这条注释以前写的是「打 e2e 隔离后端，绝不打生产」，**是错的**：
 * vite 没配 proxy，api/client.ts 的 API_BASE_URL 默认就是
 * `http://localhost:8100`（生产网关），除非显式注入 VITE_API_BASE_URL。
 * 也就是说默认跑的每一张截图渲染的都是生产数据。声明和事实对不上，
 * 比没有说明更糟 —— 下一个人会以为看到的是隔离环境。
 *
 * 两套各有用处，按需要选：
 *   生产数据   vite --port 5199                      → 数据真实，密度高，适合看版面
 *   隔离数据   VITE_API_BASE_URL=http://127.0.0.1:18100 vite --port 5199
 *                                                  → 造数据不碰生产
 *
 * 本脚本自己只读不写，但登录会在目标库里留下会话痕迹。
 *
 * 用法：
 *   npx vite --port 5199            # 另开终端
 *   npx tsx scripts/shoot.ts [outDir]
 */
import { chromium, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.SHOOT_WEB ?? 'http://127.0.0.1:5199'
const OUT = process.argv[2] ?? '/tmp/shots'
const EMAIL = process.env.SHOOT_EMAIL ?? 'admin@stashbox.local'
const PASSWORD = process.env.SHOOT_PASSWORD ?? 'admin@stashbox123'

/** 路由名 → 文件名。顺序即巡检顺序。必须与 App.tsx 的 Route 表一致。 */
const PAGES: Array<[string, string]> = [
  ['/dashboard', '01-dashboard'],
  ['/articles', '02-articles'],
  ['/tags', '03-tags'],
  ['/users', '04-users'],
  ['/audit-log', '05-audit-log'],
  ['/distill-metrics', '06-distill-metrics'],
  ['/push-notifications', '07-push'],
  ['/consents', '08-consents'],
  ['/evaluations', '09-evaluations'],
  ['/few-shot-pool', '10-few-shot-pool'],
  ['/model-routing', '11-model-routing'],
  ['/ab-report', '12-ab-report'],
  ['/audio-variants', '13-audio-variants'],
  ['/tts-blind-test', '14-tts-blind-test'],
  ['/settings/llm', '15-settings-llm'],
  ['/settings/tts', '16-settings-tts'],
  ['/settings/voices', '17-settings-voices'],
]

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.getByLabel(/邮箱|email/i).first().fill(EMAIL)
  await page.getByLabel(/密码|password/i).first().fill(PASSWORD)
  await page.getByRole('button', { name: /登录|进入|sign in/i }).first().click()
  await page.waitForURL((u) => !u.pathname.includes('login'), { timeout: 15_000 })
  await page.waitForTimeout(600)
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  for (const [w, h, tag] of [
    [1440, 900, 'desktop'],
    [390, 844, 'mobile'],
  ] as const) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 2,
      locale: 'zh-CN',
    })
    const page = await ctx.newPage()
    await login(page)
    for (const [route, name] of PAGES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' }).catch(() => {})
      // 关掉可能盖住页面的弹层，否则截到的是弹窗而不是页面本身
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(700)
      // 空白页自检：路由写错 / 白屏时 body 几乎无文本。少了它，404 页会伪装成基线。
      const chars = await page
        .evaluate(() => document.body.innerText.replace(/\s+/g, '').length)
        .catch(() => 0)
      await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: false })
      const flag = chars < 60 ? '  ⚠️ 近乎空白，检查路由' : ''
      process.stdout.write(`  ✓ ${tag}/${name}  文本${chars}字${flag}\n`)
    }
    await ctx.close()
  }
  await browser.close()
  console.log(`截图输出目录：${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
