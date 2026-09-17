# stashbox-admin-web

Stashbox 管理后台 Web 前端 —— Hornet 运营管理界面。

## 技术栈

> 版本为 `pnpm create vite@latest --template react-ts` 实际装出来的版本（2026-09-17）。

- React 19 + TypeScript 6
- Vite 8（构建工具）
- Tailwind CSS 3（样式，PostCSS + autoprefixer）
- React Router 7（路由）
- Axios（HTTP 客户端）
- React Query / SWR（后续考虑）

## 启动

```bash
# 安装依赖
pnpm install  # 或 npm install

# 启动 dev server（默认 http://localhost:5173）
pnpm dev

# 类型检查（tsc -b，全量检查 app + node 两个 project）
pnpm typecheck

# 构建生产
pnpm build
```

## 项目结构

```
src/
├── main.tsx              # 入口
├── App.tsx               # 根组件 + 路由
├── api/                  # API 客户端（按服务分）
├── pages/                # 页面（按路由分）
│   ├── Login.tsx
│   ├── Dashboard.tsx     # 总览（admin/stats）
│   ├── Users.tsx         # 用户管理（admin/users）
│   ├── Tags.tsx          # 标签管理
│   ├── Articles.tsx      # 文章管理
│   ├── PushNotifications.tsx  # 推送队列
│   └── AuditLog.tsx      # 审计日志
├── components/           # 通用组件（Layout / Table / Modal / Toast）
├── hooks/                # 自定义 hooks（useAuth / useApi）
├── types/                # TypeScript 类型定义
└── utils/                # 工具函数
```

## 后端 API

调用 `http://localhost:8100`（api-gateway）的 admin 端点（v1 §3.6）：
- `POST /api/v1/admin/auth/login`（后续加）
- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users/{id}/quota-adjust`
- `POST /api/v1/admin/articles/{id}/force-retry`
- `POST /api/v1/admin/audio/{id}/invalidate`
- `GET /api/v1/admin/audit-log`

## 工作流约定

参考 stashbox-android 仓的协作模式：
- 一个 CP 一个 commit（不混搭）
- commit message：`feat(admin-web): CP-X.X <说明>`
- 推 CP 时附 `.workbuddy/tasks/cp-X.X.md` 任务包
