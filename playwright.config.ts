import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:6007', viewport: { width: 1000, height: 800 } },
  projects: [
    { name: 'Chromium', use: { browserName: 'chromium' } },
    { name: 'Firefox', use: { browserName: 'firefox' } },
    { name: 'WebKit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npm run build-storybook -- --quiet && vite preview --host 127.0.0.1 --port 6007 --strictPort --outDir storybook-static',
    url: 'http://127.0.0.1:6007/index.json',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
