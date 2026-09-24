import { describe, it, expect } from 'vitest'
import { formatTime, formatNumber } from './utils'

describe('formatTime', () => {
  it('undefined / null / 空字符串 → "—"', () => {
    expect(formatTime(undefined)).toBe('—')
    expect(formatTime(null)).toBe('—')
    expect(formatTime('')).toBe('—')
  })

  it('合法 ISO 字符串 → zh-CN 本地化（24h）', () => {
    const s = formatTime('2024-01-15T08:30:00Z')
    // 精确时区依赖运行环境，只断言格式 zh-CN 风格（YYYY/M/D HH:mm:ss）
    expect(s).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2}$/)
    expect(s).not.toContain('AM')
    expect(s).not.toContain('PM')
  })

  it('合法数字时间戳 → 同样格式化', () => {
    const ts = new Date('2024-01-15T08:30:00Z').getTime()
    expect(formatTime(ts)).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}:\d{2}$/)
  })

  it('非法输入 → 原样返回', () => {
    expect(formatTime('not-a-date')).toBe('not-a-date')
    expect(formatTime(NaN)).toBe('NaN')
  })
})

describe('formatNumber', () => {
  it('undefined / null → "—"', () => {
    expect(formatNumber(undefined)).toBe('—')
    expect(formatNumber(null)).toBe('—')
  })

  it('数字 → zh-CN 千分位逗号分隔', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(123)).toBe('123')
    expect(formatNumber(1234)).toBe('1,234')
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('负数带负号', () => {
    expect(formatNumber(-1000)).toBe('-1,000')
  })
})