import { execFileSync } from 'node:child_process'
import { test, expect, authedPage as _ } from './fixtures'

/**
 * 真机驱动（跨端 E2E 用）。
 *
 * 为什么在 admin-web 这边写：Playwright 用例和 adb 命令要共享**同一份状态**
 * ——后台刚把配额改成 0，紧接着就得看真机上那根提示条在不在。
 * 拆成两个进程（Node 跑后台、Python 跑真机）就得靠文件/端口传状态，
 * 还得处理同步，脆得很。Node 里 `execFileSync('adb', ...)` 一行就够。
 *
 * 与 backend/tests/e2e/driver.py 同一套打法，不引入 Appium。
 */

const SERIAL = process.env.E2E_ANDROID_SERIAL ?? 'f1a9e47d'

/**
 * 真机上可能装的包（**按优先级**）。
 *
 * 为什么要**探测**而不是写死：applicationId 随 buildType 变
 * （`debug` → `com.tingxia.audio.debug`，`release` → `com.tingxia.audio`），
 * 设备上装的是哪一个取决于最后一次是谁打包的。
 *
 * 写死的后果实测过（2026-10-25）：设备上装的是 `com.tingxia.audio`（release 包，
 * 连的是生产 `https://api.stashbox.cn`），而这里写死 `.debug` ⇒
 * `am start` **静默失败** ⇒ 报「App 未在超时内进入前台」。
 * 那个报错长得像「App 起不来」，真实原因却是包名对不上 ——
 * 排查方向完全跑偏（实测查了 logcat、看了崩溃栈，都没有）。
 *
 * 活动类名**不随 applicationId 变**（都是 `com.tingxia.audio.MainActivity`），
 * 只有「包名」这一段会变。
 */
const PKG_CANDIDATES = [
  'com.tingxia.audio.debug',
  'com.tingxia.audio.minifydebug',
  'com.tingxia.audio',
]

/** 探测到的包（缓存；探测不到缓存空串，重复探测没意义）。 */
let _pkgCache: string | null = null

/**
 * 设备上到底装了哪个包。装不上返回 null（调用方据此显式 skip，
 * 而不是让断言红成一个看不出原因的样子）。
 */
export function devicePackage(): string | null {
  if (_pkgCache !== null) return _pkgCache === '' ? null : _pkgCache
  const out = adb(['shell', 'pm', 'list', 'packages'], { allowFail: true })
  // 注意必须带行尾：`com.tingxia.audio` 是 `com.tingxia.audio.debug` 的前缀，
  // 不带行尾会把 debug 包误判成 release 包。
  for (const p of PKG_CANDIDATES) {
    if (out.includes(`package:${p}\n`)) {
      _pkgCache = p
      return p
    }
  }
  _pkgCache = ''
  return null
}

/** 设备上装的那个包；没装就抛错（错误信息要能指认「是没装还是包名变了」）。 */
export function requireDevicePackage(): string {
  const p = devicePackage()
  if (!p) {
    throw new Error(
      `设备 ${SERIAL} 上没找到听匣 App（找过：${PKG_CANDIDATES.join(' / ')}）。\n` +
        '  · 装一个：./gradlew :app:assembleDebug -PapiBaseUrl=http://127.0.0.1:18100/\n' +
        '  · 然后 adb install -r app/build/outputs/apk/debug/app-debug.apk\n' +
        '  · 真机要连上隔离后端：adb reverse tcp:18100 tcp:18100',
    )
  }
  return p
}

/** 设备上的 App 是否在线（装了 + 能连上 adb）。 */
export function deviceAppReady(): boolean {
  if (!deviceOnline()) return false
  return devicePackage() !== null
}

/**
 * 真机上的 App 到底连的是**哪个后端**。
 *
 * 返回：
 * - `'e2e'`         装的是 debug 变体，且设备能探活隔离栈（adb reverse 已建）
 * - `'production'`  装的是 release 变体 —— 它连的是**生产** `api.stashbox.cn`
 * - `'unknown'`     没装 App、或 reverse 没建、设备探不通
 *
 * ## 为什么必须先判这个
 *
 * 跨端用例断言的是「同一份数据在两端表现一致」。而**两端的 App 必须指着
 * 同一个后端**，否则就是拿设备上的生产数据去比隔离库里的数据 —— 红得毫无道理。
 *
 * 实测（2026-10-25）：设备上装的是 release 包（连生产），跨端用例报的是
 * 「App 未在超时内进入前台」，真实原因是包名对不上 + 后端根本不是同一个。
 * 判据缺失时，**症状永远指向错误的方向**。
 *
 * 判据怎么做的：debug 变体的 base url 是**编译期**注入的
 * （`./gradlew :app:assembleDebug -PapiBaseUrl=http://127.0.0.1:18100/`），
 * 而 release 变体固定连生产 ⇒ 按**装的哪个变体**就能判；
 * 再用「设备能不能探活隔离栈」把 adb reverse 缺失这一层也堵上。
 */
export function deviceAppBackendKind(gatewayPort: number): 'e2e' | 'production' | 'unknown' {
  const pkg = devicePackage()
  if (!pkg) return 'unknown'
  if (pkg === 'com.tingxia.audio') return 'production' // release 变体
  // debug 变体：还得确认 reverse 隧道通
  return deviceCanReachGateway(gatewayPort) ? 'e2e' : 'unknown'
}

/** 设备能不能探活隔离栈（`adb reverse tcp:<port> tcp:<port>` 之后才行）。 */
export function deviceCanReachGateway(port: number): boolean {
  const out = adb(
    ['shell', 'curl', '-s', '-m', '4', '-o', '/dev/null', '-w', '%{http_code}', `http://127.0.0.1:${port}/healthz`],
    { allowFail: true },
  )
  return out.trim() === '200'
}

const DEVICE_USER_ID = 1

export function adb(args: string[], opts: { allowFail?: boolean } = {}): string {
  try {
    return execFileSync('adb', ['-s', SERIAL, ...args], {
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 64 * 1024 * 1024,
      // logcat 混着非 UTF-8 字节（设备端 C 层日志/崩溃转储），
      // 按 utf8 严格解码会抛 UnicodeDecodeError。
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (e) {
    if (opts.allowFail) return String((e as { stdout?: string }).stdout ?? '')
    throw e
  }
}

export function deviceOnline(): boolean {
  return adb(['get-state'], { allowFail: true }).trim() === 'device'
}

export interface UiNode {
  text: string
  desc: string
  bounds: [number, number, number, number]
  center: [number, number]
}

/** 解析 uiautomator dump 的 XML。坐标每次重新取 —— 布局会随播放条/提示条变化。 */
export function dumpUi(): UiNode[] {
  adb(['shell', 'uiautomator', 'dump', '/sdcard/e2e_cross.xml'])
  const xml = adb(['shell', 'cat', '/sdcard/e2e_cross.xml'], { allowFail: true })
  const start = xml.indexOf('<?xml')
  if (start < 0) return []

  const nodes: UiNode[] = []
  for (const m of xml.slice(start).matchAll(/<node[^>]*>/g)) {
    const n = m[0]
    const text = /text="([^"]*)"/.exec(n)?.[1] ?? ''
    const desc = /content-desc="([^"]*)"/.exec(n)?.[1] ?? ''
    const b = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(n)
    if (!b) continue
    const [x1, y1, x2, y2] = [Number(b[1]), Number(b[2]), Number(b[3]), Number(b[4])]
    nodes.push({ text, desc, bounds: [x1, y1, x2, y2], center: [(x1 + x2) >> 1, (y1 + y2) >> 1] })
  }
  return nodes
}

export function findNode(label: string): UiNode | undefined {
  return dumpUi().find((n) => n.text === label || n.desc === label)
}

export function findContaining(fragment: string): UiNode | undefined {
  return dumpUi().find((n) => n.text.includes(fragment) || n.desc.includes(fragment))
}

export function tapNode(node: UiNode): void {
  const [x, y] = node.center
  // 同点 swipe 带 100ms 按压 —— Compose 对纯 tap 的响应有时偏弱。
  adb(['shell', 'input', 'swipe', String(x), String(y), String(x), String(y), '100'])
}

/**
 * 点一个**导航类**按钮，tap 优先、swipe 兜底。
 *
 * 只用 swipe 是踩过坑的：跨端配额用例里 `input swipe` 点首页「剪藏」
 * 经常点了没反应（App 纹丝不动、连 ViewModel 都不初始化，logcat 里
 * 0 条配额请求），而同一坐标换成 `input tap` 一次就进页面了。
 * 两种手势各试一遍，比在用例里写重试稳，也比"点了就等 20 秒再判死"快。
 */
export function tapNav(node: UiNode): void {
  // 导航按钮只用 tap。先试过「swipe 再 tap」双保险，反而更糟 ——
  // swipe 的按下-抬起手势在 Compose 上会吃掉第一次点击。
  adb(['shell', 'input', 'tap', String(node.center[0]), String(node.center[1])])
}

/**
 * 点某个节点，带重试与「点到了没有」的判据。
 *
 * 光 `input swipe` 一次是不够的：App 冷启动后 Compose 还在建首帧，
 * 界面已可见但点击可能落在还没绑定的区域上，表现为「点了没反应」。
 * 所以按「判据函数变 true」来重试，而不是盲等固定秒数。
 */
export function tapUntil(
  target: UiNode,
  isDone: () => boolean,
  attempts = 4,
  doTap: (n: UiNode) => void = tapNode,
): void {
  for (let i = 0; i < attempts; i++) {
    doTap(target)
    // 每次点击后重新 dump 确认：坐标可能因布局变化失效
    const deadline = Date.now() + 6_000
    while (Date.now() < deadline) {
      if (isDone()) return
      adb(['shell', 'sleep', '1'], { allowFail: true })
    }
    // 没生效就把 target 的坐标刷新一下再点（布局可能动过）
    const fresh = findNode(target.text || target.desc)
    if (fresh) Object.assign(target, fresh)
  }
}

/** 冷启动 App。force-stop 后再起，走的是真实冷启动路径（DI 装配 / token 恢复）。 */
export function launchApp(): void {
  const pkg = requireDevicePackage()
  adb(['shell', 'am', 'force-stop', pkg])
  adb(['shell', 'am', 'start', '-n', `${pkg}/com.tingxia.audio.MainActivity`])
  waitForForeground()
}

export function waitForForeground(timeoutMs = 30_000): void {
  const pkg = requireDevicePackage()
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (adb(['shell', 'dumpsys', 'activity', 'activities'], { allowFail: true }).includes(pkg)) {
      // 6 秒，不是 2 秒。Activity 变成前台 ≠ 首页能点：Compose 首帧 +
      // 列表数据加载没完成时，dumpsys 已经报 PKG 在前台上，但点「剪藏」
      // 会没反应。实测冷启动等 2 秒必踩，等 7 秒才稳。
      adb(['shell', 'sleep', '6'])
      return
    }
    adb(['shell', 'sleep', '1'], { allowFail: true })
  }
  throw new Error('App 未在超时内进入前台')
}

/** 从首页进「剪藏」页 —— 配额提示条挂在这里。 */
export function openCaptureScreen(): void {
  // 每次重新 dump 取坐标，**按 content-desc 匹配**而不是 text。
  //
  // 首页有 4 个跟「剪藏」沾边的节点：
  //   content-desc="剪藏"  y≈501  w=168  ← 功能区大按钮（要的）
  //   text="剪藏"          y≈697  w=115  ← 文章卡片里的来源标签
  //   content-desc="剪藏"  y≈207  w= 84  ← 顶栏图标
  // 用 text + 宽度启发式去猜，点中的经常是卡片里的来源标签 —— 点了没反应，
  // 报出来却是「没进剪藏页」，排查方向完全跑偏。
  // 等首页功能区渲染出来（App 刚冷启动时可能还没画出这一块）
  const deadline0 = Date.now() + 20_000
  let btn = findCaptureEntry()
  while (!btn && Date.now() < deadline0) {
    adb(['shell', 'sleep', '1'], { allowFail: true })
    btn = findCaptureEntry()
  }
  if (!btn) {
    throw new Error(
      `首页没找到「剪藏」入口。当前 UI: ${dumpUi()
        .filter((n) => n.text)
        .map((n) => repr(n))
        .join(' | ')}`,
    )
  }
  // 判据：剪藏页的「立即剪藏」按钮出现（首页没有这个控件）
  tapUntil(btn, () => findNode('立即剪藏') !== undefined, 3, () => tapNav(btn))
  if (findNode('立即剪藏')) return
  throw new Error(
    `点了「剪藏」但没进剪藏页。\n当前 UI: ${uiSummary()}`,
  )
}

/**
 * 等某个文案出现（返回它），超时抛错并附上当前 UI。
 *
 * 跨端用例必须用这个，不能断言完就完事：剪藏页的配额条是
 * `CaptureViewModel.init { refreshQuota() }` 异步拉的，进页面那一刻
 * quotaTotal 还是 null，QuotaBanner 直接 return。页面看起来是「没有
 * 提示条」，其实只是还没拉到数据 —— 拿这个当断言会得到假失败。
 */
export function waitForText(
  fragment: string,
  timeoutMs = 20_000,
): UiNode {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const hit = findContaining(fragment)
    if (hit) return hit
    adb(['shell', 'sleep', '1'], { allowFail: true })
  }
  throw new Error(
    `${timeoutMs / 1000}s 内真机上没等到「${fragment}」。\n当前 UI: ${uiSummary()}`,
  )
}

function findCaptureEntry(): UiNode | undefined {
  return dumpUi().find(
    (n) => n.desc === '剪藏' && n.bounds[1] > 400 && n.bounds[2] - n.bounds[0] > 150,
  )
}

function repr(n: UiNode): string {
  return `<${n.text || n.desc || '?'}@${n.center}>`
}

export function uiSummary(limit = 20): string {
  return (
    dumpUi()
      .filter((n) => n.text)
      .slice(0, limit)
      .map(repr)
      .join(' | ') || '(空 UI)'
  )
}

export { DEVICE_USER_ID, PKG_CANDIDATES, SERIAL }
