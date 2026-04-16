import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './evals/tests',
  timeout: 180000,  // 3 minutes for large models
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  reporter: [
    ['html', { outputFolder: 'evals/report' }],
    ['json', { outputFile: 'evals/results.json' }],
    ['list']
  ],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
