import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Vitest config -- CP-NEW.11.
 *
 * - happy-dom: ~2x faster than jsdom for React component rendering
 * - include: only src/**\/*.{test,spec}.{ts,tsx}
 * - exclude: dist / node_modules / *.config.ts
 * - coverage: v8 provider, include utils/hooks/components/store/api pure-logic layers
 *   (page-level coverage left for future CP; current focus is hook + pure logic)
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', '**/*.config.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/utils.ts',
        'src/hooks/**/*.ts',
        'src/components/pool/**/*.tsx',
        'src/components/ui.tsx',
        'src/store/**/*.ts',
        'src/api/admin/_shared.ts',
      ],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    },
  },
})