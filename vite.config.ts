import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * 历史说明（CP TTS-Config）：CP7.3 时代 admin/llm/* 未进 gateway，
 * 曾在 vite.config.ts 里加过一段 proxy 直转 content-service（8102）。
 *
 * 当前：所有 /api/v1/* 路由都已挂进 api-gateway（8100），且 gateway
 * 已带 CORS middleware（access-control-allow-origin 在响应头里），
 * dev 模式浏览器直接跨域请求 8100 也能成功，不需要 vite 代理。
 *
 * vite 8 的 proxy 实现有变（Connection refused 等诡异错误），不引
 * 代理让 dev 体验更稳。
 */
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})