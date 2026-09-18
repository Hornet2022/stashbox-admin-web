# admin-web 端点覆盖审计报告（2026-09-18）

> **审计目的**：盘点 stashbox-admin-web 仓库对 stashbox 后端管理端点的覆盖情况
> **审计方法**：`admin.ts` API 客户端代码 + `pages/*.tsx` 实际使用 + 对照后端 main.py 端点定义
> **审计日期**：2026-09-18
> **审计人**：Hermes（承宇）

---

## 一、审计结果总览

| 维度 | 已覆盖 | 总数 | 覆盖率 |
|---|---|---|---|
| **管理 API 端点**（用户/文章/标签/推送/审计/Dashboard） | 9 / 9 | 9 | **100%** |
| **CSV 导出端点** | 3 / 5 | 5 | **60%** |
| **合计** | **12 / 14** | 14 | **86%** |

---

## 二、已覆盖端点（12 个）

### 2.1 管理 API（9/9）

| 后端端点 | admin-web 函数 | 页面 |
|---|---|---|
| `GET /api/v1/admin/users` | `listUsers` | `Users.tsx` |
| `POST /api/v1/admin/users/{id}/quota-adjust` | `adjustQuota` | `Users.tsx` |
| `GET /api/v1/articles` | `listArticles` | `Articles.tsx` |
| `POST /api/v1/admin/articles/{id}/force-retry` | `forceRetryArticle` | `Articles.tsx` |
| `POST /api/v1/admin/audio/{id}/invalidate` | `invalidateAudio` | `Articles.tsx` |
| `GET /api/v1/tags` | `listTags` | `Tags.tsx` |
| `POST /api/v1/tags` | `createTag` | `Tags.tsx` |
| `GET /api/v1/notifications` | `listPushNotifications` | `PushNotifications.tsx` |
| `GET /api/v1/admin/audit-log` | `listAuditLog` | `AuditLog.tsx` |
| `GET /api/v1/admin/stats` | `getStats` | `Dashboard.tsx` |

### 2.2 CSV 导出（3/5）

| 后端端点 | admin-web 函数 |
|---|---|
| `GET /api/v1/admin/export/users.csv` | `downloadCsv('users')` |
| `GET /api/v1/admin/export/articles.csv` | `downloadCsv('articles')` |
| `GET /api/v1/admin/export/audit-log.csv` | `downloadCsv('audit-log')` |

---

## 三、未覆盖端点（2 个）

### 3.1 🟡 `/api/v1/admin/export/feedback.csv`

**重要性**：🟡 中

**为什么需要**：运营需要导出用户反馈做数据分析（按 category 聚合 + 时间维度），是 CP7.6 Top 30 问题清单的数据源之一。

**未接影响**：
- admin-web 上看不到导出反馈的按钮
- 运营必须手 curl 后端 + 解析 CSV

**修法**：
- 在 `admin.ts` 的 `ExportKind` 加 `'feedback'`
- 在 `Articles.tsx` 或新建 `FeedbackExportButton.tsx` 加按钮

### 3.2 🟡 `/api/v1/admin/export/subscriptions.csv`

**重要性**：🟡 中

**为什么需要**：运营需要导出标签订阅用户做精准推送（CP5.4 标签订阅推送的运营基础）。

**未接影响**：
- 运营无法批量获取"科技"标签的订阅用户
- 必须手 SQL 查 TagSubscription 表

**修法**：
- 在 `admin.ts` 的 `ExportKind` 加 `'subscriptions'`
- 在 `Tags.tsx` 加按钮"导出订阅用户"

---

## 四、建议

### 4.1 立即修（CP7 启动前）

✅ **加 2 个 CSV 导出**（admin-web）—— 1 段任务包，预计 30 分钟

### 4.2 不阻塞但建议修

- admin-web 加 CI（lint + build + type check）—— admin-web 仓无 GitHub Actions workflow
- admin-web 加 operator 角色区分视图（CP1.8 已有 role，但 v0.5 没区分）
- admin-web 加单测覆盖（v0.5 加了 Loading/Toast/快捷键但没单测）

### 4.3 不修（理由）

- v1 §11 范围外（v0.5 功能完整化已完成 4 个 commit）
- v2 §产品 admin 工具范围

---

## 五、commit message

```
docs(admin-web): 端点覆盖审计报告（2026-09-18）

盘点 admin-web 对后端端点的覆盖：
- 管理 API：9/9 (100%)
- CSV 导出：3/5 (60%)
- 合计：12/14 (86%)

未覆盖：
- /api/v1/admin/export/feedback.csv
- /api/v1/admin/export/subscriptions.csv

建议 CP7 启动前补齐。
```

---

**审计完成**——承宇等 Hornet 拍补齐方案。
