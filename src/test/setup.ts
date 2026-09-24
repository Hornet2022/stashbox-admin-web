import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

/**
 * 全局 test setup —— CP-NEW.11。
 *
 * - @testing-library/jest-dom/vitest 注册 toBeInTheDocument 等 matcher
 * - 每个测试后自动 cleanup（unmount + 移除 portal 节点），防止跨用例残留
 */
afterEach(() => {
  cleanup()
})