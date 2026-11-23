import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

// Tests that talk to Supabase directly read the same .env values as the app.
Object.assign(process.env, loadEnv('development', process.cwd(), 'VITE_'))

// Headless only. Playwright starts the local dev server itself (http://localhost:5173)
// and reuses it if `npm run dev` is already running.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // One retry: the Supabase test server sometimes times out a login under load (owner approved, 22 Nov).
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    locale: 'en-US',
    // The app opens in Arabic on a first visit; tests are written in English, so each test browser
    // starts with English saved (as if the patient had chosen it). Tests of the default override this.
    storageState: {
      cookies: [],
      origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'medfriend.lang', value: 'en' }] }],
    },
    timezoneId: 'Asia/Amman',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // The professor may open the link on a phone or a laptop: test both.
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'laptop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
