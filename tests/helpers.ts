import { createClient } from '@supabase/supabase-js'
import { expect, type Page } from '@playwright/test'

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
export const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
export const PASSWORD = 'Test-password-123'

/**
 * A unique throwaway address for each test. Supabase refuses made-up domains like example.com,
 * so we use mailinator.com (a public test inbox). No email is sent: "Confirm email" is off.
 */
export function newEmail(): string {
  return `medfriend-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@mailinator.com`
}

/** Opens the app logged out and waits for the login screen. */
export async function openLoggedOut(page: Page) {
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
  await expect(page.locator('.phone-frame')).toHaveAttribute('data-auth', 'signedIn')
  await expect(page.getByText('No doses today.', { exact: false })).toBeVisible()
  return { email, password }
}

/** Opens the "My medicines" tab (medicine list, Log out). */
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
