import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

dotenv.config();

export default defineConfig({
  testDir: './tests',

  timeout: 25000,

  fullyParallel: true,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 2 : undefined,

  use: {
    extraHTTPHeaders: {
      Accept: 'application/json',
    },

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'results/results.json' }],
  ],

  projects: [
    {
      name: 'error-scenarios',
      testMatch: '**/error-scenarios.spec.ts',
    },
    {
      name: 'performance',
      testMatch: '**/performance.spec.ts',
    },
    {
      name: 'security-probe',
      testMatch: '**/security-probe.spec.ts',
    },
  ],
});