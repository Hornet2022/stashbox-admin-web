import '@testing-library/jest-dom/vitest'
import { afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
// vitest-axe 0.1.0 的 matchers.d.ts 把 toHaveNoViolations 声明成 type-only，
// 但 matchers.js 里它是函数。直接跳过 .d.ts 用 .js 后缀访问。
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'

/**
 * 全局 test setup —— CP-NEW.11。
 *
 * - @testing-library/jest-dom/vitest 注册 toBeInTheDocument 等 matcher
 * - toHaveNoViolations 来自 vitest-axe/matchers（CP-NEW.18）
 * - 每个测试后自动 cleanup（unmount + 移除 portal 节点），防止跨用例残留
 */
expect.extend({ toHaveNoViolations })

afterEach(() => {
  cleanup()
})