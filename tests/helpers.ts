import { createClient } from '@supabase/supabase-js'
import { expect, type Page } from '@playwright/test'

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
export const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
export const PASSWORD = 'Test-password-123'
/** Sign-up / login wait in tests (the server can take a few seconds under load). */
export const AUTH_TIMEOUT = 20_000

/**
 * A unique throwaway address for each test. Supabase refuses made-up domains like example.com,
 * so we use mailinator.com (a public test inbox). No email is sent: "Confirm email" is off.
 */
export function newEmail(): string {
  return `medfriend-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@mailinator.com`
}

const clocked = new WeakSet<Page>()

/**
 * Fake clock at 03:00 today (Amman), still running. Tests that use the real time would otherwise
 * meet a reminder panel (it covers the screen) whenever a dose happens to be due while they run.
 */
export async function installEarlyClock(page: Page) {
  if (clocked.has(page)) return
  clocked.add(page)
  const ammanToday = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10)
  await page.clock.install({ time: new Date(`${ammanToday}T00:00:00Z`) }) // 03:00 in Amman (UTC+3)
}

/** Opens the app logged out and waits for the login screen. */
export async function openLoggedOut(page: Page) {
  await installEarlyClock(page)
  await page.goto('/')
  await expect(page.locator('.phone-frame')).toHaveAttribute('data-auth', 'signedOut')
}

/** Creates a brand-new account through the sign-up screen; ends on the (empty) Today screen. */
export async function signUpInUI(page: Page, email = newEmail(), password = PASSWORD) {
  await openLoggedOut(page)
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('New password (at least 8 characters)').fill(password)
  await page.getByLabel('Type the password again').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  // Supabase can be slow when many tests sign up at the same time.
  await expect(page.locator('.phone-frame')).toHaveAttribute('data-auth', 'signedIn', { timeout: AUTH_TIMEOUT })
  await expect(page.getByText('No doses today.', { exact: false })).toBeVisible()
  return { email, password }
}

/** Opens the "Settings" tab (demo tools, account email, Log out). */
export async function goToSettings(page: Page) {
  await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
}

/** Opens the "My medicines" tab (medicine list). */
export async function goToMeds(page: Page) {
  await page.getByRole('navigation').getByRole('button', { name: 'My medicines' }).click()
  await expect(page.getByRole('heading', { name: 'My medicines' })).toBeVisible()
}

export async function logInInUI(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
}

/** A new account outside the browser (for database checks). */
export async function newApiUser() {
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await db.auth.signUp({ email: newEmail(), password: PASSWORD })
  expect(error).toBeNull()
  expect(data.session, 'logged in at once ("Confirm email" must be off)').not.toBeNull()
  return { db, userId: data.user!.id, session: data.session! }
}

export type MedRow = {
  name: string
  times: string[]
  createdAt?: string
  strength?: [number, string]
  /** F3: one per dose ('' = clock time). */
  anchors?: string[]
}

/** A new account with medicines added "in the past", then logged in on the page with a fake clock. */
export async function loginWithMeds(page: Page, meds: MedRow[], fakeNow: Date) {
  const user = await newApiUser()
  const rows = meds.map((m) => ({
    name: m.name,
    form: 'tablet',
    amount: 1,
    times_per_day: m.times.length,
    times: m.times,
    created_at: m.createdAt ?? '2026-11-01T06:00:00Z',
    strength_value: m.strength?.[0] ?? null,
    strength_unit: m.strength?.[1] ?? null,
    anchors: m.anchors ?? null,
  }))
  const { error } = await user.db.from('medications').insert(rows)
  expect(error).toBeNull()

  clocked.add(page)
  await page.clock.install({ time: fakeNow })
  await openLoggedOut(page)
  await logInInUI(page, user.session.user.email!, PASSWORD)
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: AUTH_TIMEOUT })
  return user
}
