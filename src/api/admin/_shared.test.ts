import { describe, it, expect } from 'vitest'
import { unwrap, normalizeList } from './_shared'

/**
 * admin API 共享 helper 单元测试 —— CP-NEW.11。
 *
 * unwrap：剥掉 api-gateway 的 {code,message,data} 信封
 * normalizeList：分页响应归一化（兼容数组 / items / list / records / tags 四种命名）
 */

describe('unwrap', () => {
  it('剥离标准信封 {code,message,data}', () => {
    expect(unwrap<{ x: number }>({ code: 0, message: 'ok', data: { x: 42 } })).toEqual({ x: 42 })
  })

  it('剥离部分信封：有 code 但无 message', () => {
    expect(unwrap<number>({ code: 0, data: 100 })).toBe(100)
  })

  it('剥离部分信封：有 message 但无 code', () => {
    expect(unwrap<string>({ message: 'ok', data: 'payload' })).toBe('payload')
  })

  it('只有 data 无 code/message → 不视作信封，原样返回', () => {
    // 实测行为：unwrap 仅在含 code 或 message 时才剥信封
    // 后端真实响应一定有 code/message，所以这个分支是边界保护
    const payload = { data: 100 }
    expect(unwrap<unknown>(payload)).toEqual({ data: 100 })
  })

  it('已是裸数据时原样返回', () => {
    expect(unwrap<number>(100)).toBe(100)
    expect(unwrap<string[]>(['a', 'b'])).toEqual(['a', 'b'])
    expect(unwrap<{ a: 1 }>({ a: 1 })).toEqual({ a: 1 })
  })

  it('null / undefined 边界', () => {
    expect(unwrap<null>(null)).toBe(null)
    expect(unwrap<undefined>(undefined)).toBe(undefined)
  })
})

describe('normalizeList', () => {
  it('数组响应 → items + total = length', () => {
    const r = normalizeList<number>([1, 2, 3])
    expect(r.items).toEqual([1, 2, 3])
    expect(r.total).toBe(3)
  })

  it('数组响应（信封包装）→ 同上', () => {
    const r = normalizeList<number>({ code: 0, data: [1, 2] })
    expect(r.items).toEqual([1, 2])
    expect(r.total).toBe(2)
  })

  it('items 命名分页响应', () => {
    const r = normalizeList<{ id: string }>({
      items: [{ id: 'a' }, { id: 'b' }],
      total: 25,
    })
    expect(r.items).toHaveLength(2)
    expect(r.total).toBe(25)
  })

  it('list 命名分页响应', () => {
    const r = normalizeList<{ id: string }>({ list: [{ id: 'x' }], count: 10 })
    expect(r.items).toHaveLength(1)
    expect(r.total).toBe(10)
  })

  it('records 命名分页响应', () => {
    const r = normalizeList<{ id: string }>({ records: [{ id: 'r1' }] })
    expect(r.items).toHaveLength(1)
    expect(r.total).toBe(1)
  })

  it('tags 命名分页响应（评测标注等特殊命名）', () => {
    const r = normalizeList<{ name: string }>({
      tags: [{ name: 't1' }, { name: 't2' }],
      total: 5,
    })
    expect(r.items).toHaveLength(2)
    expect(r.total).toBe(5)
  })

  it('空对象 → 空 items + total=0', () => {
    const r = normalizeList<unknown>({})
    expect(r.items).toEqual([])
    expect(r.total).toBe(0)
  })

  it('null / undefined → 空 items + total=0', () => {
    expect(normalizeList<unknown>(null).items).toEqual([])
    expect(normalizeList<unknown>(undefined).items).toEqual([])
  })

  it('total 缺省时 fallback 到 items.length', () => {
    const r = normalizeList<number>({ items: [1, 2, 3, 4] })
    expect(r.total).toBe(4)
  })
})