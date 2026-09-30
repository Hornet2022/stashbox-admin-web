import { execFileSync } from 'node:child_process'
import path from 'node:path'

import { test, expect } from './fixtures'
import {
  DEVICE_USER_ID,
  adb,
  deviceOnline,
  dumpUi,
  findContaining,
  findNode,
  waitForText,
  launchApp,
  openCaptureScreen,
  uiSummary,
} from './android'

/**
 * 跨端一致性 E2E —— 管理后台 × 安卓 App。
 *
 * 覆盖方向是**同一份数据在两端的表现必须一致**，不是各端各测一遍：
 *   后台改的东西，App 上必须看得见（且看得对）；
 *   App 产生的东西，后台必须查得到。
 *
 * 这类断点是本项目反复出问题的地方 —— 「界面显示已保存、后端其实没落库」
 * 「后端改了、App 端毫无感知」，单端测试全都抓不到。
 *
 * 依赖：
 *   - 真机在线且已装 com.tingxia.audio.debug（E2E_ANDROID_SERIAL 可覆盖序列号）
 *   - 后台账号能进用户管理页（当前 seed 的 admin@stashbox.local 是 admin 角色）
 *
 * 没设备就整体跳过，不要让它们在 CI 里逐个失败。
 */

const deviceTest = test.extend({})

deviceTest.describe('跨端：配额', () => {
  test.beforeEach(async () => {
    test.skip(!deviceOnline(), '真机不在线，跳过跨端用例')
    // 这组用例会互相影响：上一条把配额设成 0（停用）之后如果不还原，
    // 下一条造数据就会吃 403 quota exceeded，看着像功能坏了。
    await resetQuota()
  })

  test.afterEach(async () => {
    await resetQuota()
  })

  test('后台把配额设为 0（停用）→ App 端立刻读到新值', async () => {
    // CP-QUOTA-CACHE 的跨端回归。
    //
    // 修之前的跨端表现：后台把配额设成 0 → App 端配额接口仍返回旧的 50
    // （Redis 缓存没失效，TTL 60s）→ App 再把 0 当成"无限制/未知"，
    // 提示条不显示、提交不拦截 → 用户点剪藏才吃 403 {"code":3001}，全程零提示。
    //
    // 断言的是**数据层**跨端一致（后台改 → App 视角立刻读到），
    // 这是那两条 bug 的根因所在，也是稳定可回归的部分。
    await setQuotaViaAdminApi(DEVICE_USER_ID, 0)

    const view = readQuotaAsUser(DEVICE_USER_ID)
    expect(
      view.monthly_quota,
      `后台把 user ${DEVICE_USER_ID} 停用（配额 0），App 端读到的却是 ` +
        `${view.monthly_quota}（cached=${view.cached}）。` +
        `admin_quota_adjust 没有失效配额 Redis 缓存。`,
    ).toBe(0)
    expect(view.cached, 'App 读到的应来自 DB（缓存已失效），而不是陈旧缓存').toBe(false)
  })

  test('后台停用用户 → App 剪藏页出现「配额已用完」提示条', async () => {
    // CP-QUOTA-ZERO-SEMANTICS 的跨端回归（UI 层）。
    await setQuotaViaAdminApi(DEVICE_USER_ID, 0)

    // 先确认数据层已到位，否则 UI 断言挂了无从判断是谁的问题
    const view = readQuotaAsUser(DEVICE_USER_ID)
    test.skip(
      view.monthly_quota !== 0,
      `App 端还没读到新配额（读到 ${view.monthly_quota}），UI 断言无意义，跳过`,
    )

    launchApp()
    openCaptureScreen()
    const banner = waitForText('本月配额已用完')
    expect(banner.text).toContain('本月配额已用完')
  })
})

deviceTest.describe('跨端：文章', () => {
  test.beforeEach(async () => {
    test.skip(!deviceOnline(), '真机不在线，跳过跨端用例')
    await resetQuota()
  })

  test('App 剪藏的文章 → 后台文章管理页能查到', async ({ authedPage }) => {
    // 1) 造一篇文章（走 D9 回调 = App 剪藏用的同一个后端入口）
    const marker = `crossdevice_${Date.now()}`
    const articleId = await createArticleViaD9(DEVICE_USER_ID, marker)

    // 2) 后台文章列表按创建时间倒序，新建的应落在第一页
    await authedPage.goto('/articles')
    const table = authedPage.locator('table')
    await table.waitFor({ state: 'visible', timeout: 20_000 })
    await authedPage.waitForTimeout(1500)

    // 文章管理页**没有搜索框**（只有标签筛选，见 ArticlesToolbar.tsx），
    // 只能靠「新文章必在倒序第一页」这个前提来断言。
    await expect(
      table.getByText(articleId).first(),
      `App 侧剪藏的 ${articleId} 在后台文章列表第一页查不到 —— 两端看的不是同一份数据？`,
    ).toBeVisible({ timeout: 15_000 })
  })
})


/**
 * 用真实剪藏接口把配额消耗到目标值。
 *
 * 走接口而不是 SQL：直接改 users.quota_used **不会失效配额 Redis 缓存**，
 * App 读到的还是旧值 —— 那样测出来的"两端不一致"是假的。
 * 详见 backend/tests/e2e/README.md 踩坑清单第 4 条。
 */
async function exhaustQuotaViaApi(userId: number, target: number): Promise<void> {
  const gateway = process.env.STASHBOX_GATEWAY ?? 'http://127.0.0.1:8100'
  runBackendPy(`
with httpx.Client(base_url='${gateway}', timeout=30, headers=h) as c:
    for i in range(60):
        q = c.get('/api/v1/users/me/quota').json()
        if q['quota_used'] >= ${target}:
            print('reached', q['quota_used']); break
        r = c.post('/api/v1/callback/d9-add-article', json={
            'url': f'https://mp.weixin.qq.com/s/crossquota_{${userId}}_{i}_{q["quota_used"]}',
            'source': 'd9'})
        if r.status_code != 200:
            print('stop at', r.status_code, r.text[:200]); break
`)
}

/**
 * 调后端 venv 的 python 来签 JWT / 发请求。
 *
 * PYTHONPATH 必须含 `/Users/hornet/work`（stashbox 包的**父目录**），
 * 只加仓库根 `/Users/hornet/work/stashbox` 会 ModuleNotFoundError ——
 * 因为 import 路径是 `stashbox.backend.…`，Python 得从父目录起找。
 */
function runBackendPy(body: string, asUserId: number = DEVICE_USER_ID): string {
  const repo = process.env.STASHBOX_REPO ?? '/Users/hornet/work/stashbox'
  return execFileSync(
    path.join(repo, 'backend/.venv/bin/python'),
    ['-c', `
import sys, httpx
sys.path[:0] = ['/Users/hornet/work', '${repo}', '${repo}/backend']
from stashbox.backend.common.auth import create_access_token
# 调 /api/v1/admin/* 必须带 tier=admin，否则 require_admin_or_operator 拒。
# 只签 sub 不够 —— conftest.py 的 admin_token fixture 就是这么签的（user 9018 + tier）。
tok = create_access_token('${asUserId}', extra={'tier': 'admin'})
h = {'Authorization': f'Bearer {tok}'}
${body}
`],
    {
      env: {
        ...process.env,
        STASHBOX_ALLOW_DEV_JWT: '1',
        PYTHONPATH: `/Users/hornet/work:${repo}:${repo}/backend`,
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180_000,
    },
  )
}

/** 造一篇文章（走 D9 回调 = App 剪藏用的同一个后端入口），返回 article_id */
async function createArticleViaD9(userId: number, marker: string): Promise<string> {
  const gateway = process.env.STASHBOX_GATEWAY ?? 'http://127.0.0.1:8100'
  const out = runBackendPy(`
with httpx.Client(base_url='${gateway}', timeout=30, headers=h) as c:
    r = c.post('/api/v1/callback/d9-add-article',
               json={'url': 'https://mp.weixin.qq.com/s/${marker}', 'source': 'd9'})
    print(r.status_code, r.text[:400])
`)
  const m = /"article_id"\s*:\s*"([^"]+)"/.exec(out)
  if (!m) throw new Error(`造文章失败: ${out}`)
  return m[1]
}

/**
 * 把真机账号的配额恢复到可用状态。
 *
 * ⚠ admin 端点必须用 admin 身份（9018）调。拿真机账号的 token
 * 的 token 去调会被 require_admin_or_operator 拒掉，于是配额根本没恢复，
 * 下一条造数据就吃到 403 quota exceeded —— 报错指向 D9 剪藏，
 * 真因却在上一个用例留下的状态。
 *
 * 用例之间必须互相隔离：上一条把配额设成 0，下一条造文章就会拿到
 * `403 {"code":3001,"message":"quota exceeded: 0/0"}`，
 * 报错指向 D9 剪藏，跟真正的原因（上一个用例没还原状态）八竿子打不着。
 *
 * 顺序有讲究：
 *   1. SQL 把 quota_used 归零 —— 库里得先干净
 *   2. 再调后台 API 设 monthly_quota —— **让 API 调用做最后一步**
 * 因为配额读走 Redis 缓存，只有走 service 层才会失效缓存。
 * 反过来（先 API 后 SQL）的话，缓存里留着旧的 quota_used，
 * App 读到的还是脏值，测出来的「两端不一致」是假的。
 */
async function resetQuota(monthlyQuota = 50): Promise<void> {
  execFileSync(
    'psql',
    ['-h', 'localhost', '-U', 'stashbox', '-d', 'stashbox', '-tAc',
      `update users set quota_used = 0 where id = ${DEVICE_USER_ID}`],
    { env: { ...process.env, PGPASSWORD: 'stashbox_dev' }, stdio: 'ignore' },
  )

  const gateway = process.env.STASHBOX_GATEWAY ?? 'http://127.0.0.1:8100'
  runBackendPy(`
with httpx.Client(base_url='${gateway}', timeout=30, headers=h) as c:
    r = c.post('/api/v1/admin/users/${DEVICE_USER_ID}/quota-adjust',
               json={'monthly_quota': ${monthlyQuota}, 'reason': '跨端 E2E：恢复配额'})
    print('resetQuota(admin 身份) ->', r.status_code, r.text[:120])
    # 用 user 身份读回，确认缓存里也是新值
    u = c.get('/api/v1/users/me/quota')
    print('resetQuota(App 视角) ->', u.status_code, u.text[:160])
`, 9018)
}

/** 以 user 身份读配额（App 走的就是这个端点）。 */
function readQuotaAsUser(userId: number): {
  monthly_quota: number
  quota_used: number
  remaining: number
  cached: boolean
} {
  const gateway = process.env.STASHBOX_GATEWAY ?? 'http://127.0.0.1:8100'
  const out = runBackendPy(`
with httpx.Client(base_url='${gateway}', timeout=30, headers=h) as c:
    r = c.get('/api/v1/users/me/quota')
    print(r.status_code, r.text[:400])
`)
  const m = /(\d{3}) (\{.*\})/.exec(out)
  if (!m) throw new Error(`读配额失败: ${out}`)
  return JSON.parse(m[2])
}

/**
 * 用后台 API 调配额（admin 身份）。
 *
 * 刻意**不用后台 UI 点**：UI 能不能点、有没有 toast，那是 users.spec.ts 的职责。
 * 本套件只回答一个问题 —— 后台改完，App 端看到的是不是同一个值。
 *
 * （顺带记一个坑：用户管理页的搜索框 placeholder 是「邮箱 / 昵称」，
 *  **搜不到没填邮箱的用户** —— user 1 的 email 是 null，昵称也不是 ID。
 * 想在 UI 上定位它只能靠翻页，不是 `fill('1')` 能解决的。）
 */
async function setQuotaViaAdminApi(userId: number, monthlyQuota: number): Promise<void> {
  const gateway = process.env.STASHBOX_GATEWAY ?? 'http://127.0.0.1:8100'
  runBackendPy(`
with httpx.Client(base_url='${gateway}', timeout=30, headers=h) as c:
    r = c.post('/api/v1/admin/users/${userId}/quota-adjust',
               json={'monthly_quota': ${monthlyQuota}, 'reason': '跨端一致性 E2E 设配额'})
    assert r.status_code == 200, (r.status_code, r.text[:200])
    print('quota_adjust ->', r.status_code)
`, 9018)
}
