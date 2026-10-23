/**
 * 营销页排版验收（2026-10-23）。
 *
 * 用途：肉眼看不出的排版问题（文字压住分隔线、整页超出一屏、手机竖屏溢出）
 *      用像素量出来，别靠「看着还行」。
 *
 * 为什么放在 admin-web 仓：整个工作区里只有这里装了 playwright
 * （营销页在 stashbox 仓，是自包含静态页、没有任何 node 工具链）。
 *
 * 跑法（在本仓下）：
 *   node scripts/measure-landing.mjs ../stashbox/infra/web/index.html
 *   node scripts/measure-landing.mjs ../stashbox/infra/web/index.html --shots
 *
 * --shots 会额外把每个视口的截图写到 /tmp/shot-<视口名>.png。
 *
 * 它是**门禁**：改完营销页跑一遍，任何视口出现「可滚动」或「压线」都不算通过。
 */
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const shots = args.includes('--shots')
const target = args.find((a) => !a.startsWith('--'))
if (!target) {
  console.error('用法: node scripts/measure-landing.mjs <index.html 路径> [--shots]')
  process.exit(2)
}

const VIEWPORTS = [
  { name: '大屏 1920x1080', width: 1920, height: 1080 },
  { name: '桌面 1440x900', width: 1440, height: 900 },
  { name: '笔记本 1366x768', width: 1366, height: 768 },
  { name: '笔记本 1280x720', width: 1280, height: 720 },
  { name: '平板竖屏 768x1024', width: 768, height: 1024 },
  { name: '手机竖屏 412x915', width: 412, height: 915 },
  { name: '手机竖屏 390x844', width: 390, height: 844 },
  { name: '手机竖屏 360x640', width: 360, height: 640 },
  { name: '小屏 320x568', width: 320, height: 568 },
  { name: '手机横屏 844x390', width: 844, height: 390 },
]

const browser = await chromium.launch({ executablePath: '/Users/hornet/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' })

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  await page.goto(pathToFileURL(resolve(target)).href)
  await page.waitForTimeout(400)

  const m = await page.evaluate(() => {
    const out = { docHeight: document.documentElement.scrollHeight, viewH: window.innerHeight }
    out.scrollable = out.docHeight > out.viewH + 1

    // 三栏：每栏的右边界线与文字实际占位
    const cols = [...document.querySelectorAll('.v-broadsheet .col')]
    out.cols = cols.map((col) => {
      const cb = col.getBoundingClientRect()
      const p = col.querySelector('p:last-of-type') || col.querySelector('p')
      const pr = p.getBoundingClientRect()
      // 逐行量文字的实际右端（用 Range 取每一行）
      const range = document.createRange()
      const textNode = p.firstChild
      const lines = []
      if (textNode && textNode.nodeType === 3) {
        for (let i = 0; i < textNode.length; i++) {
          range.setStart(textNode, i)
          range.setEnd(textNode, i + 1)
          const r = range.getBoundingClientRect()
          lines.push({ ch: textNode.data[i], left: r.left, right: r.right })
        }
      }
      // 按 top 分组成行，取每行最大 right
      const byTop = new Map()
      for (const l of lines) {
        const k = Math.round(l.top)
        const cur = byTop.get(k)
        if (!cur || l.right > cur.right) byTop.set(k, l)
      }
      const lineRights = [...byTop.values()].map((l) => Math.round(l.right))
      // 竖线位置：两种画法都要认 ——
      // ① 伪元素画在两栏空隙中央（::after，right 是负值）
      // ② 老式的 border-right（在栏的右边缘内侧）
      const style = getComputedStyle(col)
      const after = getComputedStyle(col, '::after')
      let lineX
      if (after.content && after.content !== 'none' && parseFloat(after.width) > 0) {
        const right = parseFloat(after.right)
        lineX = Math.round(cb.right - right)   // right:-24px → 线在栏外侧 24px
      } else {
        lineX = Math.round(cb.right - parseFloat(style.borderRightWidth || '0'))
      }
      return {
        colLeft: Math.round(cb.left),
        colRight: Math.round(cb.right),
        paddingRight: style.paddingRight,
        borderRight: style.borderRightWidth,
        lineX,
        lineRights,
        // 文字右端到竖线的最小距离（负数 = 压线）
        minGap: lineRights.length ? Math.min(...lineRights.map((r) => lineX - r)) : null,
      }
    })

    // 逐段高度：定位「大头」到底在哪，别靠猜
    out.sections = []
    for (const sel of ['.v-broadsheet', '.v-broadsheet .masthead', '.v-broadsheet .headline',
                       '.v-broadsheet h1', '.v-broadsheet .standfirst', '.v-broadsheet .cols',
                       '.v-broadsheet .col', '.v-broadsheet .cta-row', '.site-footer']) {
      const el = document.querySelector(sel)
      if (!el) continue
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      out.sections.push({
        sel,
        h: Math.round(r.height),
        top: Math.round(r.top),
        padT: cs.paddingTop, padB: cs.paddingBottom,
        marginT: cs.marginTop, marginB: cs.marginBottom,
        font: cs.fontSize,
      })
    }

    // 首屏是否装得下：最后一个元素（页脚）底边 vs 视口底
    const footer = document.querySelector('.site-footer')
    if (footer) {
      const fb = footer.getBoundingClientRect()
      out.footerBottom = Math.round(fb.bottom)
      out.footerFits = fb.bottom <= window.innerHeight + 1
    }
    const cta = document.querySelector('.v-broadsheet .cta-row')
    if (cta) {
      const cb = cta.getBoundingClientRect()
      out.ctaBottom = Math.round(cb.bottom)
      out.ctaVisible = cb.top < window.innerHeight && cb.bottom > 0
    }
    return out
  })

  console.log(`\n══ ${vp.name} ══`)
  console.log(`  文档高 ${m.docHeight}px / 视口 ${m.viewH}px → ${m.scrollable ? '⚠ 可滚动（超 ' + (m.docHeight - m.viewH) + 'px）' : '✓ 一屏'}`)
  if (m.ctaBottom != null) {
    console.log(`  CTA 行底 ${m.ctaBottom}px → ${m.ctaVisible ? '✓ 在首屏内' : '⚠ 超出首屏'}`)
  }
  if (m.footerFits != null) {
    console.log(`  页脚底 ${m.footerBottom}px → ${m.footerFits ? '✓ 在首屏内' : '⚠ 超出首屏'}`)
  }
  m.sections.forEach((sec) => {
    console.log(`    ${sec.sel.padEnd(28)} h=${String(sec.h).padStart(4)}  top=${String(sec.top).padStart(4)}  pad=${sec.padT}/${sec.padB} margin=${sec.marginT}/${sec.marginB} font=${sec.font}`)
  })
  m.cols.forEach((c, i) => {
    const gap = c.minGap == null ? 'n/a' : c.minGap + 'px'
    const flag = c.minGap != null && c.minGap < 4 ? ' ⚠ 压线' : ''
    console.log(`  栏${i + 1}: 文字右端 ${JSON.stringify(c.lineRights)} 竖线x=${c.lineX} 最小间距 ${gap}${flag}`)
  })
  if (shots) {
    await page.screenshot({ path: `/tmp/shot-${vp.width}x${vp.height}.png` })
  }
  await page.close()
}

await browser.close()
