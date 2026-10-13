import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    env: { VITE_API_URL: 'http://localhost' },
    projects: [
      // Pure logic: fast, no DOM.
      { extends: true, test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] } },
      // Components, hooks and integration tests.
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['src/test/setup.ts'],
          // jsdom + user-event start slowly when many files run in parallel.
          testTimeout: 15_000,
        },
      },
    ],
  },
})
