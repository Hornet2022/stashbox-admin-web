import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * CP7.3 临时代理：/api/v1/admin/llm/* 还没挂进 api-gateway 路由表
 * （8100 会返回 "no downstream route"），而 content-service 自己没装
 * CORS 中间件，浏览器直连 8202 会被 CORS 拦掉。所以 dev server 把这组
 * 路径代理到 content-service。等网关补上路由后整段删掉即可。
 *
 * 目标地址可用 CONTENT_SERVICE_URL 覆盖，默认 http://localhost:8202。
 */
const CONTENT_SERVICE_URL = process.env.CONTENT_SERVICE_URL ?? 'http://localhost:8202'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/v1/admin/llm': {
        target: CONTENT_SERVICE_URL,
        changeOrigin: true,
      },
    },
  },
})
