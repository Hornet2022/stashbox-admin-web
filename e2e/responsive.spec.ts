import { test, expect, type Page } from './fixtures'

/**
 * 窄屏（375px）布局回归。
 *
 * 这批断言存在的原因：这四处修复全是「桌面看不出来、一到窄屏就露馅」的
 * 类型。改完之后如果没人量，把 w-full sm:w-44 改回 w-44 不会有任何测试变红
 * —— 类名改对了，视觉又错了，而 e2e 还在跑。
 *
 * 因此每条断言都量**真实几何**（getBoundingClientRect），不查类名：
 * 类名只是意图，盒子才是结果。
 */

const NARROW = { width: 375, height: 812 }
const DESKTOP = { width: 1280, height: 800 }

/** 允许 1px 的亚像素误差（Chromium 的 flex/grid 取整）。 */
const EPS = 1

type Box = { left: number; right: number; width: number }

/** 读一组元素的真实盒子，顺序与 DOM 顺序一致。 */
async function boxesOf(page: Page, selector: string, index = 0): Promise<Box[]> {
  return page.evaluate(
    ({ sel, idx }) => {
      const roots = document.querySelectorAll(sel)
      const root = roots[idx]
      if (!root) return []
      return Array.from(root.children).map((el) => {
        const r = el.getBoundingClientRect()
        return { left: r.left, right: r.right, width: r.width }
      })
    },
    { sel: selector, idx: index },
  )
}

/**
 * 量一个「过滤行 + 行内某按钮 + tab 组」的三元几何关系。
 *
 * sm:ml-auto 那一类改动的判据是**行尾还剩多少空白**：带 ml-auto 时这个值
 * 是 0（按钮被顶到行尾），没有就是按钮的固有宽度 + 剩余空间。
 * 用它而不是「按钮和前一个元素的间距」，因为一行里往往还夹着别的控件
 * （推送页就有 user_id 输入），间距对不上任何直觉阈值。
 */
async function measureRow(page: Page, buttonLabel: string) {
  return page.evaluate((label) => {
    const btn = (
      label.startsWith('aria:')
        ? document.querySelector(`[aria-label="${label.slice(5)}"]`)
        : Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === label)
    ) as HTMLElement
    if (!btn) throw new Error(`找不到按钮：${label}`)
    const row = btn.parentElement as HTMLElement
    const tab = row.querySelector('[role="tablist"]') as HTMLElement
    if (!tab) throw new Error('这一行里没有 tablist')
    const b = btn.getBoundingClientRect()
    const r = row.getBoundingClientRect()
    const t = tab.getBoundingClientRect()
    return {
      rowWidth: r.width,
      tabWidth: t.width,
      buttonWidth: b.width,
      rowRightGap: r.x + r.width - (b.x + b.width),
      btnFromTabRight: b.x - (t.x + t.width),
      sameLine: Math.abs(b.y - t.y) < 4,
    }
  }, buttonLabel)
}

test.describe('窄屏布局', () => {
  test('审计日志：筛选字段在 375px 占满整行，在 1280px 恢复定宽', async ({ authedPage: page }) => {
    // form.mt-6 是 AuditLog 的过滤表单，四个字段是它的 div 子元素
    const sel = 'form.mt-6'

    await page.setViewportSize(NARROW)
    await page.goto('/audit-log')
    await expect(page.locator(sel)).toBeVisible()
    const narrow = await boxesOf(page, sel)
    const formWidth = await page.locator(sel).evaluate((el) => el.getBoundingClientRect().width)
    expect(narrow.length).toBeGreaterThanOrEqual(4)
    for (const b of narrow.slice(0, 4)) {
      // w-full sm:w-44 在 375px 下 sm: 不命中，必须是整行宽。
      // 改回固定宽度的话这条会红（176/224/208px 对 300px+ 的表单）。
      expect(b.width).toBeCloseTo(formWidth, 0)
    }

    await page.setViewportSize(DESKTOP)
    await page.goto('/audit-log')
    await expect(page.locator(sel)).toBeVisible()
    const wide = await boxesOf(page, sel)
    // sm:w-44 / sm:w-56 / sm:w-52 ×2 = 176 / 224 / 208 / 208
    expect(wide.slice(0, 4).map((b) => Math.round(b.width))).toEqual([176, 224, 208, 208])
  })

  test('总览：「规模与存量」概览卡在 375px 是单列，1280px 是三列', async ({ authedPage: page }) => {
    // Section 渲染 <section><h2>标题</h2>…，概览网格是 section 里的第一个 .grid
    const heading = '规模与存量'

    await page.setViewportSize(NARROW)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()

    const narrowGrid = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: heading }) })
      .locator('div.grid')
      .first()
    await expect(narrowGrid.locator('> *').first()).toBeVisible()
    const narrow = await narrowGrid.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return {
        gridWidth: r.width,
        cards: Array.from(el.children).map((c) => {
          const cr = c.getBoundingClientRect()
          return { left: cr.left, width: cr.width }
        }),
      }
    })
    expect(narrow.cards.length).toBeGreaterThan(1)
    // 单列 = 所有卡左边缘一致；两列会得到 2 个不同的 left
    expect(new Set(narrow.cards.map((c) => Math.round(c.left))).size).toBe(1)
    // 单列还意味着每张卡铺满整行（只有 gap，没有列间距）
    for (const c of narrow.cards) {
      expect(c.width).toBeCloseTo(narrow.gridWidth, 0)
    }

    await page.setViewportSize(DESKTOP)
    await page.goto('/dashboard')
    const wideGrid = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: heading }) })
      .locator('div.grid')
      .first()
    await expect(wideGrid.locator('> *').first()).toBeVisible()
    const wide = await wideGrid.evaluate((el) =>
      Array.from(el.children).map((c) => Math.round(c.getBoundingClientRect().left)),
    )
    // 1280 ≥ lg(1024)，所以命中的是 lg:grid-cols-5。
    // 这一条真正防的是「改回 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5」
    // 之类把首列数弄错的回退 —— 列数变了，卡的宽度就跟着变。
    expect(new Set(wide).size).toBe(5)
  })

  test('同意记录：刷新键在 375px 紧跟 tab 组，右端留白而非贴边', async ({ authedPage: page }) => {
    await page.setViewportSize(NARROW)
    await page.goto('/consents')
    await expect(page.getByRole('button', { name: '刷新' })).toBeVisible()

    const m = await measureRow(page, '刷新')
    // 343px 行里 tab 组 212 + gap 12 + 按钮 54 = 278，放得下，刷新键紧跟 tab 组
    expect(m.sameLine).toBe(true)
    expect(m.btnFromTabRight).toBeGreaterThanOrEqual(8)
    expect(m.btnFromTabRight).toBeLessThanOrEqual(20)
    // 关键判据：右端要留出空白。带 ml-auto 时 ml 把按钮顶到行尾，这里是 0
    expect(m.rowRightGap).toBeGreaterThan(40)
  })

  test('推送通知：刷新键在 375px 换行后仍靠左，右端留白而非贴边', async ({ authedPage: page }) => {
    // 过滤行是「tab 组 + user_id 输入 + 刷新」三件，flex-wrap。
    // 375px 下 tab 组 271 独占第一行，user_id + 刷新落到第二行。
    //
    // sm:ml-auto 的意图：≥640px 把刷新键推到右端；<640px 时行会换行，
    // ml-auto 会把它推到**它自己那一行**的右端，孤零零右对齐，
    // 和它所过滤的 tab 组看着毫无关系。
    //
    // 所以窄屏下的判据不是「和 tab 组贴多近」（中间隔着 user_id），
    // 而是「它有没有被顶到行尾」。
    await page.setViewportSize(NARROW)
    await page.goto('/push-notifications')
    await expect(page.getByRole('button', { name: '刷新推送列表' })).toBeVisible()

    const m = await measureRow(page, 'aria:刷新推送列表')
    expect(m.sameLine).toBe(false) // 确实换行了，这一页才需要防 ml-auto
    // 行尾留白 52px；ml-auto 会把它压到 0
    expect(m.rowRightGap).toBeGreaterThan(20)
  })

  test('375px 下全站无横向溢出', async ({ authedPage: page }) => {
    await page.setViewportSize(NARROW)
    const routes = [
      '/dashboard', '/users', '/tags', '/articles', '/push-notifications',
      '/audit-log', '/distill-metrics', '/settings/llm', '/settings/tts',
      '/settings/voices', '/few-shot-pool', '/evaluations', '/model-routing',
      '/tts-blind-test', '/ab-report', '/audio-variants', '/consents',
    ]
    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => ({
        // 注意：必须用 body 而不是 documentElement —— Chromium 里
        // documentElement.scrollWidth 会把后代滚动容器的溢出也算进去，
        // 表格 min-w-max 的横向滚动会被误报成整页溢出。
        bodyScroll: document.body.scrollWidth,
        bodyClient: document.body.clientWidth,
        scrolledX: window.scrollX,
      }))
      expect(
        overflow.bodyScroll - overflow.bodyClient,
        `${route} 在 375px 横向溢出 ${overflow.bodyScroll - overflow.bodyClient}px`,
      ).toBeLessThanOrEqual(EPS)
      expect(overflow.scrolledX, `${route} 页面被横向滚动了`).toBe(0)
    }
  })
})
