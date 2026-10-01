import { describe, it, expect, beforeEach } from 'vitest'
import { toErrorMessage, isEndpointMissing, getAuthToken, setAuthToken, clearAuthToken, API_BASE_URL, ADMIN_API_PREFIX } from './client'

/**
 * api/client.ts 工具函数单测 —— CP-NEW.12。
 *
 * 覆盖：toErrorMessage / isEndpointMissing / getAuthToken /
 * setAuthToken / clearAuthToken / 常量导出。
 */

describe('toErrorMessage', () => {
  it('优先使用后端 detail / message', () => {
    const e = { response: { data: { message: '业务校验失败：URL 已存在' } } }
    expect(toErrorMessage(e)).toBe('业务校验失败：URL 已存在')
  })

  it('业务 404/501 → "端点不存在"', () => {
    expect(toErrorMessage({ response: { status: 404 } })).toBe('端点不存在（404 / 501）')
    expect(toErrorMessage({ response: { status: 501 } })).toBe('端点不存在（404 / 501）')
  })

  it('401 → "登录已失效"', () => {
    expect(toErrorMessage({ response: { status: 401 } })).toBe('登录已失效，请重新登录')
  })

  it('403 → "无权限"', () => {
    expect(toErrorMessage({ response: { status: 403 } })).toBe('无权限访问该资源')
  })

  it('429 → "请求过于频繁"', () => {
    expect(toErrorMessage({ response: { status: 429 } })).toBe('请求过于频繁，请稍后再试')
  })

  it('500+ → "服务端错误（xxx）"', () => {
    expect(toErrorMessage({ response: { status: 500 } })).toBe('服务端错误（500）')
    expect(toErrorMessage({ response: { status: 503 } })).toBe('服务端错误（503）')
  })

  it('其他 status → "请求失败（xxx）"', () => {
    expect(toErrorMessage({ response: { status: 418 } })).toBe('请求失败（418）')
  })

  it('ECONNABORTED → "请求超时"（默认描述）', () => {
    expect(toErrorMessage({ code: 'ECONNABORTED' })).toMatch(/请求超时/)
    expect(toErrorMessage({ code: 'ECONNABORTED' })).toMatch(/第三方服务/)
    // v3 修复：不再硬编码 "IndexTTS / 阿里云 maas"（这俩是 TTS provider 名，
    // 套到 LLM 测试上下文里会误导）。文案应使用通用 "第三方服务"。
    expect(toErrorMessage({ code: 'ECONNABORTED' })).not.toMatch(/IndexTTS/)
    expect(toErrorMessage({ code: 'ECONNABORTED' })).not.toMatch(/阿里云 maas/)
  })

  it('ECONNABORTED + config.timeout → 文案报**这次请求实际**的秒数（BUG#11）', () => {
    // 音色试听把 timeout 单独放宽到 180s（真跑 oMLX 合成，实测 ~120s）。
    // 照抄全局 API_TIMEOUT_SEC 会显示成「请求超时（15s）」，自相矛盾且带偏排查。
    const msg = toErrorMessage({ code: 'ECONNABORTED', config: { timeout: 180_000 } })
    expect(msg).toMatch(/请求超时（180s）/)
    expect(msg).not.toMatch(/15s/)
  })

  it('ECONNABORTED 但 config.timeout 缺失/异常 → 回落到全局默认值', () => {
    for (const config of [undefined, {}, { timeout: 0 }, { timeout: -1 }]) {
      expect(toErrorMessage({ code: 'ECONNABORTED', config })).toMatch(/请求超时（15s）/)
    }
  })

  it('ECONNABORTED + context → 文案用调用方传入的描述（CP-ERROR-MSG-v3）', () => {
    // LLM 测试场景
    const llmMsg = toErrorMessage({ code: 'ECONNABORTED' }, 'OpenAI 兼容端点（OpenAI / 火山方舟 / qwen_vl）')
    expect(llmMsg).toMatch(/OpenAI 兼容端点/)
    expect(llmMsg).toMatch(/请求超时/)
    expect(llmMsg).not.toMatch(/IndexTTS/)
    // TTS 测试场景
    const ttsMsg = toErrorMessage({ code: 'ECONNABORTED' }, 'TTS 服务（OpenAI / 豆包 / edge-tts / IndexTTS）')
    expect(ttsMsg).toMatch(/IndexTTS/)
  })

  it('ECONNABORTED + 空 context → 回落到默认 "第三方服务"', () => {
    expect(toErrorMessage({ code: 'ECONNABORTED' }, '')).toMatch(/第三方服务/)
    expect(toErrorMessage({ code: 'ECONNABORTED' }, '   ')).toMatch(/第三方服务/)
  })

  it('其他无 response → "无法连接 api-gateway"', () => {
    expect(toErrorMessage({ code: 'ERR_NETWORK' })).toMatch(/无法连接 api-gateway/)
    expect(toErrorMessage({})).toMatch(/无法连接 api-gateway/)
  })
})

describe('isEndpointMissing', () => {
  it('404 → missing=true', () => {
    expect(isEndpointMissing({ response: { status: 404 } })).toBe(true)
  })

  it('501 → missing=true', () => {
    expect(isEndpointMissing({ response: { status: 501 } })).toBe(true)
  })

  it('400/500/网络断开 → missing=false', () => {
    expect(isEndpointMissing({ response: { status: 400 } })).toBe(false)
    expect(isEndpointMissing({ response: { status: 500 } })).toBe(false)
    expect(isEndpointMissing({ code: 'ERR_NETWORK' })).toBe(false)
    expect(isEndpointMissing({ code: 'ECONNABORTED' })).toBe(false)
    expect(isEndpointMissing({})).toBe(false)
  })
})

describe('getAuthToken / setAuthToken / clearAuthToken', () => {
  beforeEach(() => {
    document.cookie = 'admin_token=; Max-Age=0; path=/'
    document.cookie = 'stashbox_admin_token=; Max-Age=0; path=/'
    localStorage.clear()
  })

  it('cookie 优先：cookie 有值时返回 cookie', () => {
    document.cookie = 'admin_token=cookie-jwt; path=/'
    expect(getAuthToken()).toBe('cookie-jwt')
  })

  it('cookie 是 httpOnly（document.cookie 读不到）时退回 localStorage', () => {
    localStorage.setItem('stashbox_admin_token', 'local-jwt')
    expect(getAuthToken()).toBe('local-jwt')
  })

  it('两个 cookie 名都试：admin_token / stashbox_admin_token', () => {
    document.cookie = 'stashbox_admin_token=other-jwt; path=/'
    expect(getAuthToken()).toBe('other-jwt')
  })

  it('setAuthToken 写到 localStorage', () => {
    setAuthToken('my-jwt')
    expect(localStorage.getItem('stashbox_admin_token')).toBe('my-jwt')
  })

  it('clearAuthToken 清 localStorage + 删两个 cookie', () => {
    localStorage.setItem('stashbox_admin_token', 'to-clear')
    document.cookie = 'admin_token=cookie-to-clear; path=/'
    clearAuthToken()
    expect(localStorage.getItem('stashbox_admin_token')).toBe(null)
    // cookie 清除通过设置 Max-Age=0
    expect(document.cookie.includes('admin_token=cookie-to-clear')).toBe(false)
  })
})

describe('常量', () => {
  it('API_BASE_URL 默认 localhost:8100', () => {
    // vitest 默认无 VITE_API_BASE_URL，应回落到默认
    expect(API_BASE_URL).toBe('http://localhost:8100')
  })

  it('ADMIN_API_PREFIX 是 /api/v1/admin', () => {
    expect(ADMIN_API_PREFIX).toBe('/api/v1/admin')
  })
})