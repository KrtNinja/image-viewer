import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Файлы без модульных тестов попадают в отчёт с нулевым покрытием.
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text', 'lcov'],
    },
  },
})
