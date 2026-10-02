/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand: ink + cream + warm ochre
        ink: '#1A1A1A',
        cream: '#F5F2EB',
        'warm-ochre': '#A67B5B',

        // Warm neutral scale (light mode)
        'neutral-50':  '#F5F2EB',
        'neutral-100': '#E8E4DD',
        'neutral-200': '#D4CFC6',
        'neutral-300': '#B8B2A8',
        'neutral-400': '#8C8680',
        'neutral-500': '#6A665F',
        'neutral-600': '#4A4642',
        'neutral-700': '#353129',
        'neutral-800': '#242019',
        'neutral-900': '#1A1614',

        // Semantic colors (low saturation)
        // 下面三个是**填充/描边/色块**用的：在米白底上 3.24:1 / 2.39:1 / 3.36:1，
        // 达不到正文 4.5:1，但色块面积大、有背景兜底，按 3:1 的大字/图形规则算合格。
        success: '#6B8E7F',
        warning: '#C4956A',
        error:   '#B87070',

        // 文字专用色阶（*-ink）：同一色相压暗到米白底上 5.10 / 5.25 / 5.44:1。
        // 为什么需要分开：语义色是单例，同一个值不可能既当色块又当小字。
        // 全站最刺眼的问题是「该样本无法播放」这种硬失败提示用的是
        // text-warning —— 2.39:1 是整套系统里对比度最低的颜色，却扛着
        // 信息量最大、最不容看错的那类消息（低对比度承载高风险文案）。
        // 色块继续用原来的浅一档，文字改用 ink。
        'success-ink': '#4A6E5E',
        'warning-ink': '#8A5A2B',
        'error-ink':   '#9A4A4A',

        // Dark mode surface/border
        'dark-bg':     '#1A1614',
        'dark-surface':'#242019',
        'dark-border': '#3A352E',
        'dark-text':   '#E8E4DD',
        'dark-muted':  '#8C8680',
      },

      fontFamily: {
        sans:  ['Inter', 'Noto Serif SC', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif SC', 'Georgia', 'serif'],
        mono:  ['JetBrains Mono', 'Menlo', 'monospace'],
      },

      // ⚠️ 不要动 spacing。
      //
      // 这里曾经用 `spacing: {'4':'4px','8':'8px',...}` 覆盖 Tailwind 的间距刻度，
      // 想把「8-based 节奏」强制贯彻到全局。后果是整份刻度被劫持：
      //   p-4  → 4px（Tailwind 默认 16px）
      //   py-3 → 0px（3 不在表里，工具类直接不存在）
      //   h-8  → 8px（默认 32px）
      //   w-24 → 24px（默认 96px）
      // 表格单元格的 `px-4 py-3` 于是变成「左右 4px、上下 0」——行高完全由
      // 内容决定，卡片内边距忽大忽小。截图上看只是「有点挤」，但它其实让
      // 整套版面失去了可预测性：同一个 p-4 在不同人手里是两个意思。
      //
      // Tailwind 默认刻度本身就是 4px 基数，取偶数就落在 8 的倍数上，
      // 8-based 节奏不需要靠劫持刻度来达成。需要显式命名时用 CSS 变量
      // （index.css 里的 --space-4/8/12/…），它不参与工具类命名解析。
      spacing: {},

      // 设计系统间距 token 的显式命名空间。想表达「这是 8-based 设计刻度」
      // 而不是「这是 Tailwind 的第 N 档」时用它，避免两种含义混在同一个
      // 类名前缀里。
      // 暂未启用：等真有页面需要跨越默认刻度表达设计节奏时再开。

      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },

      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.04)',
        'md': '0 2px 6px rgba(0,0,0,0.06)',
      },

      typography: {
        DEFAULT: {
          css: {
            color: '#1A1A1A',
            fontFamily: 'Inter, "Noto Serif SC", system-ui, sans-serif',
          },
        },
      },
    },
  },
  plugins: [],
}
