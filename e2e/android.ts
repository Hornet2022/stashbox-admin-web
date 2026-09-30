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
const PKG = 'com.tingxia.audio.debug'
const ACTIVITY = `${PKG}/com.tingxia.audio.MainActivity`
/** 真机在登录的账号 —— 后台要改的就是这个用户的配额 */
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
  adb(['shell', 'am', 'force-stop', PKG])
  adb(['shell', 'am', 'start', '-n', ACTIVITY])
  waitForForeground()
}

export function waitForForeground(timeoutMs = 30_000): void {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (adb(['shell', 'dumpsys', 'activity', 'activities'], { allowFail: true }).includes(PKG)) {
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

export { DEVICE_USER_ID, PKG, SERIAL }
