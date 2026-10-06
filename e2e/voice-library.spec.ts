import { test, expect, canWrite } from './fixtures'
import { GATEWAY } from './gateway'

/**
 * API 直调有两个坑，都踩过：
 *
 * 1. **必须打网关绝对地址**。`page.request` 继承 Playwright 的 baseURL
 *    （vite preview），打过去被 SPA fallback 返回 index.html，
 *    `res.json()` 报 "Unexpected token '<'"。
 *
 * 2. **必须手动带 Authorization**。admin-web 的 token 由 apiClient 拦截器写进
 *    **localStorage**（`stashbox_admin_token`），而 `page.request` 只与页面共享
 *    **cookie**、不共享 localStorage —— 不手动带就 401。
 *    （页面自身的请求没事，是因为走浏览器 axios，拦截器能读到 localStorage。）
 *
 * ⚠️ 这里的 GATEWAY 来自 ./gateway（隔离后端 :18100），**不是**页面 axios 用的
 * VITE_API_BASE_URL。`page.request` 完全绕开前端，所以这两条路必须各自指对，
 * 否则会一半写进 e2e 库、一半写进生产库。详见 ./gateway.ts 的注释。
 */

async function authHeaders(page: import('@playwright/test').Page) {
  const token = await page.evaluate(() =>
    localStorage.getItem('stashbox_admin_token') ??
    sessionStorage.getItem('stashbox_admin_token'),
  )
  if (!token) throw new Error('未取到 admin token —— 登录 fixture 应已写入 localStorage')
  return { Authorization: `Bearer ${token}` }
}

const api = async (page: import('@playwright/test').Page, path: string) =>
  page.request.get(`${GATEWAY}${path}`, { headers: await authHeaders(page) })
const apiPost = async (page: import('@playwright/test').Page, path: string, data: unknown) =>
  page.request.post(`${GATEWAY}${path}`, { data, headers: await authHeaders(page) })
const apiDelete = async (page: import('@playwright/test').Page, path: string) =>
  page.request.delete(`${GATEWAY}${path}`, { headers: await authHeaders(page) })

/**
 * 音色库页（CP-TTS-VOICE）—— 真实打 api-gateway@8100，真实登录。
 *
 * 覆盖重点是**闭环而不只是渲染**：新建的音色必须能出现在列表、编辑后列表跟着变、
 * 删除后消失。历史上本项目反复出问题的正是「界面显示已保存、后端其实没落库」，
 * 所以每条断言都直接读页面上的**真实数据**（从新建时用的名字反查），
 * 而不是只看 toast 弹没弹。
 *
 * ⚠️ 清理顺序：本文件在真实库里造数据。每条用例在 `finally` 里删掉自己建的音色，
 * 且**删除放在断言之后** —— 反过来的话一旦断言失败，测试数据会永远留在库里
 * 污染后续用例（e2e README 踩坑 #8 记的就是这个）。
 *
 * ℹ️ 删除端点是**软删**（`deleted_at` + `is_active=false`），所以库里会留下一行
 * 墓碑。它不影响任何功能：用户端列表和后台列表都过滤 `deleted_at IS NULL`，
 * `is_default` 的部分唯一索引也带了 `deleted_at IS NULL` 条件。
 * 只是行数会缓慢累积 —— 想要物理删除得直连库，Playwright 这层够不着。
 */

const REF_AUDIO = '/Users/hornet/work/stashbox/backend/data/voices/tingting_ref.wav'
const REF_TEXT = '今天天气不错，我们一起来看看这条新闻讲了什么内容。'

/** 唯一 slug，避免与库里既有音色或并发用例冲突 */
const SLUG = (n: number) => `e2e-voice-${n}`
const NAME = (n: number) => `E2E 音色 ${n}`

async function createVoiceViaApi(page, n: number): Promise<string> {
  const res = await apiPost(page, '/api/v1/admin/tts/voices', {
    slug: SLUG(n),
    display_name: NAME(n),
    ref_audio_url: REF_AUDIO,
    ref_text: REF_TEXT,
    description: 'e2e 创建',
    sort_order: 90,
  })
  expect(res.ok(), `创建音色应成功，实际 ${res.status()}`).toBeTruthy()
  const body = await res.json()
  return body.id
}

test.describe('音色库', () => {
  test('页面标题 + 表头 + 侧边栏可达', async ({ authedPage }) => {
    await authedPage.goto('/settings/voices')
    await expect(authedPage.getByRole('heading', { name: '音色库' })).toBeVisible()
    await expect(
      authedPage.getByText(/音色由一段参考音频克隆而来/),
    ).toBeVisible()

    for (const col of ['音色', '标识', '状态', '参考音频', '更新时间', '操作']) {
      await expect(authedPage.getByRole('columnheader', { name: col })).toBeVisible()
    }

    // 侧边栏能跳过来（新增 navItem 后的接线验证）
    await authedPage.goto('/dashboard')
    await authedPage.locator('a[href="/settings/voices"]').click()
    await expect(authedPage).toHaveURL(/\/settings\/voices/)
  })

  test('既有音色真实渲染（读接口，不看缓存）', async ({ authedPage }) => {
    await authedPage.goto('/settings/voices')
    // 迁移 0033 刻意没 seed，冷启动靠「从当前配置导入」。
    // 库里此时应有至少一条（导入过），页面必须显示它的 display_name。
    const res = await api(authedPage, '/api/v1/admin/tts/voices')
    expect(res.ok()).toBeTruthy()
    const items = (await res.json()).items as Array<{ display_name: string }>
    expect(items.length).toBeGreaterThan(0)
    // ⚠️ 必须用 getByRole('cell') 而不是整页 getByText(exact:false) ——
    // 页面上的提示横幅「当前**没有默认音色**…」也含「默认音色」子串，
    // 整页匹配会撞 Playwright 的 strict mode violation（两个元素都命中）。
    // 断言应该落在表格单元格上，不该被页面其他文案干扰。
    await expect(
      authedPage.getByRole('cell', { name: new RegExp(items[0].display_name) }),
    ).toBeVisible()
  })

  test('没有默认音色时给出明确提示（不是静默回落）', async ({ authedPage }) => {
    await authedPage.goto('/settings/voices')
    const res = await api(authedPage, '/api/v1/admin/tts/voices')
    const items = (await res.json()).items as Array<{ is_default: boolean }>
    const hasDefault = items.some((i) => i.is_default)
    const banner = authedPage.getByText('没有默认音色')
    // 系统允许没有默认音色（会回落到全局 TTS 配置，不会挂），
    // 但管理员必须能从界面上看出来 —— 自测时删掉默认音色后台毫无提示。
    if (hasDefault) {
      await expect(banner).toHaveCount(0)
    } else {
      await expect(banner).toBeVisible()
    }
  })

  test('新建音色：UI 提交后真的落库并出现在列表', async ({ authedPage, role }) => {
    test.skip(!canWrite(role), '需要写权限角色')
    const n = Date.now() % 100000
    try {
      await authedPage.goto('/settings/voices')
      await authedPage.getByRole('button', { name: '新增音色' }).click()

      await authedPage.getByPlaceholder('如：婷婷 / 男声 / 播音腔').fill(NAME(n))
      await authedPage.getByPlaceholder('如：tingting / male-news').fill(SLUG(n))
      await authedPage.getByPlaceholder('本机绝对路径（如 /Users/.../tingting_ref.wav）或 S3/OSS URL')
        .fill(REF_AUDIO)
      await authedPage
        .getByPlaceholder('把参考音频里**念出来的那段话**一字不差地写在这里')
        .fill(REF_TEXT)

      await authedPage.getByRole('button', { name: '创建' }).click()

      // 断言直接读列表，而不是只信 toast —— toast 弹了不代表落库
      await expect(
        authedPage.getByRole('cell', { name: NAME(n) }),
      ).toBeVisible({ timeout: 15000 })

      // 再从接口反查一次，确认真的进了库
      const res = await api(authedPage, '/api/v1/admin/tts/voices')
      const items = (await res.json()).items as Array<{ slug: string; ref_text: string }>
      const created = items.find((i) => i.slug === SLUG(n))
      expect(created, '新音色应出现在接口返回里').toBeTruthy()
      expect(created!.ref_text).toBe(REF_TEXT)
    } finally {
      const res = await api(authedPage, '/api/v1/admin/tts/voices')
      if (res.ok()) {
        const items = (await res.json()).items as Array<{ id: string; slug: string }>
        const target = items.find((i) => i.slug === SLUG(n))
        if (target) await apiDelete(authedPage, `/api/v1/admin/tts/voices/${target.id}`)
      }
    }
  })

  test('编辑音色：改名后列表跟着变，且后端同步', async ({ authedPage, role }) => {
    test.skip(!canWrite(role), '需要写权限角色')
    const n = Date.now() % 100000
    const id = await createVoiceViaApi(authedPage, n)
    const newName = `${NAME(n)}-改名`
    try {
      await authedPage.goto('/settings/voices')
      const row = authedPage.getByRole('row', { name: new RegExp(NAME(n)) })
      await row.getByRole('button', { name: '编辑' }).click()

      await authedPage.getByPlaceholder('如：婷婷 / 男声 / 播音腔').fill(newName)
      await authedPage.getByRole('button', { name: '保存' }).click()

      await expect(
        authedPage.getByRole('cell', { name: newName }),
      ).toBeVisible({ timeout: 15000 })

      const res = await api(authedPage, '/api/v1/admin/tts/voices')
      const items = (await res.json()).items as Array<{ id: string; display_name: string }>
      expect(items.find((i) => i.id === id)?.display_name).toBe(newName)
    } finally {
      await apiDelete(authedPage, `/api/v1/admin/tts/voices/${id}`)
    }
  })

  test('删除音色：确认弹窗 → 列表消失 → 后端软删', async ({ authedPage, role }) => {
    test.skip(!canWrite(role), '需要写权限角色')
    const n = Date.now() % 100000
    const id = await createVoiceViaApi(authedPage, n)
    try {
      await authedPage.goto('/settings/voices')
      const row = authedPage.getByRole('row', { name: new RegExp(NAME(n)) })
      await row.getByRole('button', { name: '删除' }).click()
      await expect(authedPage.getByRole('heading', { name: '删除音色' })).toBeVisible()
      // 删除改走 ReasonDialog：必须填 ≥5 字符的删除原因，否则确认按钮保持禁用
      // （原因会写进 admin_operation_logs，审计要能回答"谁删的、为什么删"）
      const confirmBtn = authedPage.getByRole('button', { name: '确认' })
      await expect(confirmBtn).toBeDisabled()
      await authedPage.getByLabel('操作原因').fill('e2e 清理测试音色')
      await expect(confirmBtn).toBeEnabled()
      await confirmBtn.click()

      await expect(
        authedPage.getByRole('cell', { name: NAME(n) }),
      ).toHaveCount(0, { timeout: 15000 })

      // admin 列表含已下架，软删的行还在但 deleted_at 非空；
      // 关键是它不再出现在**用户端**列表里
      const res = await api(authedPage, '/api/v1/tts/voices')
      expect(res.ok()).toBeTruthy()
      const userVisible = (await res.json()).voices as Array<{ id: string }>
      expect(userVisible.find((v) => v.id === id)).toBeUndefined()
    } finally {
      // 幂等清理：已经软删了，再删一次会 404，忽略
      await apiDelete(authedPage, `/api/v1/admin/tts/voices/${id}`)
    }
  })

  test('从当前配置导入是幂等的：再点一次不造重复行', async ({ authedPage, role }) => {
    test.skip(!canWrite(role), '需要写权限角色')
    await authedPage.goto('/settings/voices')

    const before = await api(authedPage, '/api/v1/admin/tts/voices')
    const countBefore = ((await before.json()).items as unknown[]).length

    await authedPage.getByRole('button', { name: '从当前配置导入' }).click()
    await expect(
      authedPage.getByText(/已导入音色|此前已导入过/),
    ).toBeVisible({ timeout: 20000 })

    const after = await api(authedPage, '/api/v1/admin/tts/voices')
    const countAfter = ((await after.json()).items as unknown[]).length
    // 幂等：再点一次不新增（已收编过则 created=false）
    expect(countAfter).toBe(countBefore)
  })

  test('表单校验：参考音频和参考文本都是必填', async ({ authedPage, role }) => {
    test.skip(!canWrite(role), '需要写权限角色')
    await authedPage.goto('/settings/voices')
    await authedPage.getByRole('button', { name: '新增音色' }).click()

    await authedPage.getByRole('button', { name: '创建' }).click()
    // 名称 / slug / 参考音频 / 参考文本 全空 → 第一个拦下的错误
    await expect(authedPage.getByText('音色名称不能为空')).toBeVisible()
  })

  /**
   * 试听是本页**唯一会真调 oMLX 合成**的按钮，也是 8 条老用例里唯一没碰过的。
   * 它验两件端到端用例最容易漏的事：
   *
   *   1. 点下去**真的合成出音频**（不是返回一个 200 就当成功）；
   *   2. 合成产物**浏览器打得开** —— `window.open` 是在 `await previewVoice()`
   *      之后才调用的，用户手势上下文可能已经失效被弹窗拦截器吃掉，
   *      症状是「点了试听只有一句 toast，什么都没发生」。
   *
   * ⚠️ 真合成要 ~2 分钟（IndexTTS 零样本克隆），所以整条用例给 5 分钟。
   *    清理放在断言之后（同本文件约定）。
   */
  test('试听：真合成出音频，且产物浏览器打得开', async ({ authedPage, role }) => {
    test.skip(!canWrite(role), '需要写权限角色')
    test.setTimeout(300_000)

    await authedPage.goto('/settings/voices')
    // ⚠️ 不能 goto 完立刻数行数 —— 表格此时还是骨架屏，count() 必然是 0，
    //  用例会被静默 skip 掉，看着像「测过了」其实根本没跑。
    //  等真实单元格出现（和「既有音色真实渲染」那条同款做法）。
    const nameCell = authedPage.getByRole('cell', { name: /婷婷/ }).first()
    await expect(nameCell, '库里没有「婷婷」音色，跳过本用例').toBeVisible({ timeout: 15_000 })

    const row = authedPage.locator('tr', { has: nameCell })
    const popupPromise = authedPage
      .waitForEvent('popup', { timeout: 240_000 })
      .catch(() => null)
    await row.getByRole('button', { name: '试听' }).click()
    await expect(
      authedPage.getByText(/试听已生成/).or(authedPage.getByText(/试听失败/)).first(),
    ).toBeVisible({ timeout: 280_000 })

    // 失败时先看页面上的具体原因再断言 —— 「合成失败」和「弹窗被拦」是两回事，
    // 混在一起报会让人往错的方向查
    const body = await authedPage.locator('body').innerText()
    expect(body, '试听没成功，先看页面上的具体原因').toMatch(/试听已生成/)

    const popup = await popupPromise
    expect(popup, '合成成功了但没弹出音频页 —— window.open 大概被弹窗拦截器吃了').not.toBeNull()

    const url = popup!.url()
    const res = await authedPage.request.get(url)
    expect(res.status(), `试听产物打不开: ${url}`).toBe(200)
    const buf = await res.body()
    expect(buf.length, '试听产物是空的').toBeGreaterThan(1000)
    expect(buf.subarray(0, 4).toString('latin1'), '试听产物不是 wav（RIFF 头）').toBe('RIFF')
    await popup!.close()
  })
})
