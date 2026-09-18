# 听匣 Design System

## 品牌定位

> 给眼睛减负、把内容消化交给 AI、把通勤时间变成深度阅读。
> 听匣是"内容消费的 AI 翻译机"——UI 是配角不是主角。

用户在通勤时戴耳机闭眼消费内容，UI 只需要安静地存在。

## 视觉气质

- **安静 / 留白 / 印刷感 / 工具感**
- **给眼睛减负** — 低对比、温和色彩、不刺激
- **克制** — 少动效、弱投影、留白多
- **不是** SaaS 蓝紫渐变 / Material 默认紫 / 玻璃拟态 / emoji

## 品牌色板

| Token | Hex | 用途 |
|-------|-----|------|
| `ink` | `#1A1A1A` | 主文字、主色调 |
| `cream` | `#F5F2EB` | 浅色背景 |
| `warm-ochre` | `#A67B5B` | 主高亮（替代 SaaS 蓝） |
| `warm-gray-100` | `#F5F2EB` | 浅色表面 |
| `warm-gray-200` | `#E8E4DD` | 边框线 |
| `warm-gray-300` | `#D4CFC6` | 禁用态/次要边框 |
| `warm-gray-500` | `#8C8680` | 次要文字 |
| `warm-gray-700` | `#4A4642` | 主文字（暗色） |
| `warm-gray-900` | `#1A1A1A` | 主文字（亮色） |

### 语义色

| Token | Hex | 用途 |
|-------|-----|------|
| `success` | `#6B8E7F` | 成功状态（低饱和绿灰） |
| `warning` | `#C4956A` | 警告状态（低饱和橙灰） |
| `error` | `#B87070` | 错误状态（低饱和红灰） |

### 暗色模式

| Token | Hex | 用途 |
|-------|-----|------|
| `dark-bg` | `#1A1614` | 暖深色背景（不是纯黑） |
| `dark-surface` | `#242019` | 暗色卡片/表面 |
| `dark-border` | `#3A352E` | 暗色边框 |
| `dark-text` | `#E8E4DD` | 暗色主文字 |
| `dark-muted` | `#8C8680` | 暗色次要文字 |

## Typography

### 字体

- **中文**: `Noto Serif SC`（思源宋体）— 古朴、安静、有文化感
- **英文**: `Inter` — 克制、印刷感
- **Mono**: `JetBrains Mono` — 代码/数字

### Scale

```
text-xs:    12px / 16sp  — 辅助说明
text-sm:    14px / 20sp  — 表格/次要
text-base:  16px / 24sp  — 正文
text-lg:    18px / 28sp  — 标题（小）
text-xl:    20px / 28sp  — 标题（中）
text-2xl:   24px / 32sp  — 页面标题
text-3xl:   30px / 36sp  — 大标题
```

## Spacing（8 进制）

```
4  / 8  / 12 / 16 / 24 / 32 / 48 / 64 / 96
```

## Radius

```
sm: 4px   — 按钮、输入框
md: 8px   — 卡片、徽章
lg: 12px  — 模态框、抽屉
xl: 16px  — 大容器
```

## Shadow（极弱）

```
shadow-sm:  0 1px 2px rgba(0,0,0,0.04)
shadow-md:  0 2px 6px rgba(0,0,0,0.06)
```

**不用重投影** — 用 `border` 或 `inset` 代替

## 组件原则

1. **无 emoji** — 全部用 Lucide Icons / Material Icons Outlined
2. **无 glassmorphism** — 去掉 `backdrop-blur`、透明叠层
3. **无紫蓝渐变** — 永远不用 `bg-gradient-to-r from-indigo-500 to-purple-500`
4. **无卡片嵌套卡片** — 最多一层嵌套
5. **少动效** — 只保留 tabs sliding / success check / error shake
6. **留白多** — padding 至少 16px，内容之间至少 12px gap
7. **弱对比** — 边框用 warm-gray-200，不是 gray-200

## 反模式清单

- ❌ `bg-gradient-to-r from-indigo-500 to-purple-500`
- ❌ `backdrop-blur-md bg-white/70`
- ❌ emoji 作为图标或状态指示
- ❌ `rounded-2xl` 或更大圆角（Material 那种）
- ❌ `shadow-xl shadow-2xl` 重投影
- ❌ 亮色模式下 `bg-slate-900` 深色表面
- ❌ `text-2xl font-bold` 页面标题（改用 `text-xl font-semibold`）
- ❌ 卡片内嵌套卡片
- ❌ pill / shimmer / breathing 动画
- ❌ 固定 48px 高的 icon + heading 并排模板

## 动效策略

### 保留（克制出现）

- **Tabs sliding** — 切换 tab 时的 pill 滑动，250ms ease-out
- **Success check** — 操作成功后的对勾动画，500ms
- **Error shake** — 表单错误时的抖动，300ms

### 移除

- Skeleton shimmer / pulse
- 数字 count-up 动画
- 页面进入时的 fade/slide 动画
- 任何"呼吸"效果

## 设计参考（气质，非抄）

- Linear — 安静工具感
- Notion — 克制留白
- Kindle — 沉浸阅读感
- Are.na — 安静信息密度
