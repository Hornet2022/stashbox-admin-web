/**
 * CP-NEW.18：扩展 vitest Assertion 类型，注册 toHaveNoViolations matcher。
 *
 * 原因：vitest-axe 0.1.0 的 matchers.d.ts 把 toHaveNoViolations 声明为 type-only，
 * 但 matchers.js 实际导出函数。直接 import 在 verbatimModuleSyntax 下报错，
 * 所以这里通过 module augmentation 桥接。
 */

import 'vitest'
import type { AxeMatchers } from 'vitest-axe/matchers'

declare module 'vitest' {
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}