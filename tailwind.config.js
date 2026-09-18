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
        success: '#6B8E7F',
        warning: '#C4956A',
        error:   '#B87070',

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

      spacing: {
        '4':  '4px',
        '8':  '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '48': '48px',
        '64': '64px',
        '96': '96px',
      },

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
