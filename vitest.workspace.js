import { defineWorkspace } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineWorkspace([
  {
    test: {
      name: 'api',
      environment: 'node',
      include: ['tests/api/**/*.test.js'],
      setupFiles: ['./tests/api/setup.js'],
      fileParallelism: false,
      testTimeout: 20_000,
    },
  },
  {
    plugins: [react()],
    test: {
      name: 'web',
      environment: 'jsdom',
      globals: true,
      include: ['tests/web/**/*.test.{js,jsx}'],
      setupFiles: ['./tests/web/setup.js'],
    },
  },
])
