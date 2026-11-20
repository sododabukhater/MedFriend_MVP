import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'

// Acceptance criteria: docs/specs/DB-supabase.md
const url = process.env.VITE_SUPABASE_URL!
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
const projectRef = new URL(url).hostname.split('.')[0]
const storageKey = `sb-${projectRef}-auth-token`

/** Opens the app as a first-time visitor (each test has a fresh, empty browser) and waits for the silent sign-in. */
async function firstVisit(page: Page) {
  await page.goto('/')
  await expect(page.locator('.phone-frame')).toHaveAttribute('data-session', 'ready')
}

async function savedUser(page: Page) {
  const raw = await page.evaluate((k) => localStorage.getItem(k), storageKey)
  expect(raw, 'session saved in localStorage').not.toBeNull()
  return JSON.parse(raw!).user as { id: string; is_anonymous: boolean }
}

/** A fresh anonymous user, outside the browser (for the RLS checks). */
async function newAnonymousClient(): Promise<{ db: SupabaseClient; userId: string }> {
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await db.auth.signInAnonymously()
  expect(error).toBeNull()
  return { db, userId: data.user!.id }
}

test('First visit creates an anonymous user without any screen or click', async ({ page }) => {
  await firstVisit(page)
  const user = await savedUser(page)
  expect(user.is_anonymous).toBe(true)
  await expect(page.getByRole('alert')).toHaveCount(0)

  // A refresh keeps the same user.
  await page.reload()
  await expect(page.locator('.phone-frame')).toHaveAttribute('data-session', 'ready')
  expect((await savedUser(page)).id).toBe(user.id)
})

test('A second browser gets a different user', async ({ page, browser }) => {
  await firstVisit(page)
  const first = await savedUser(page)

  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await firstVisit(otherPage)
  const second = await savedUser(otherPage)
  await other.close()

  expect(second.id).not.toBe(first.id)
})

test('Shows a clear message when the database cannot be reached, and recovers', async ({ page }) => {
  // Each test starts in a fresh browser (empty storage). Block Supabase before the first load.
  await page.route(`${url}/**`, (route) => route.abort())
  await page.goto('/')

  await expect(page.locator('.phone-frame')).toHaveAttribute('data-session', 'error')
  await expect(page.getByRole('alert')).toContainText('Cannot reach Med Friend online')

  await page.unroute(`${url}/**`)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.phone-frame')).toHaveAttribute('data-session', 'ready')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('RLS: one user cannot see or change another user\'s rows', async ({}, testInfo) => {
  // Database check only; the screen size does not matter, so run it once.
  test.skip(testInfo.project.name !== 'phone', 'runs once')

  const a = await newAnonymousClient()
  const b = await newAnonymousClient()

  const { data: med, error: insertError } = await a.db
    .from('medications')
    .insert({ name: 'RLS test medicine', form: 'tablet', amount: 1, times_per_day: 1, times: ['08:00'] })
    .select()
    .single()
  expect(insertError).toBeNull()
  expect(med.user_id).toBe(a.userId)

  try {
    // Owner can read and log a dose.
    const own = await a.db.from('medications').select('id').eq('id', med.id)
    expect(own.data).toHaveLength(1)
    const ownLog = await a.db
      .from('dose_logs')
      .insert({ medication_id: med.id, scheduled_at: new Date().toISOString(), status: 'taken' })
    expect(ownLog.error).toBeNull()

    // The other user sees nothing.
    expect((await b.db.from('medications').select('id')).data).toEqual([])
    expect((await b.db.from('dose_logs').select('id')).data).toEqual([])

    // The other user cannot change or delete it.
    const upd = await b.db.from('medications').update({ name: 'hacked' }).eq('id', med.id).select()
    expect(upd.data).toEqual([])
    const del = await b.db.from('medications').delete().eq('id', med.id).select()
    expect(del.data).toEqual([])

    // The other user cannot write rows in the first user's name...
    const asA = await b.db
      .from('medications')
      .insert({ user_id: a.userId, name: 'x', form: 'tablet', amount: 1, times_per_day: 1 })
    expect(asA.error).not.toBeNull()
    // ...or log a dose against the first user's medicine.
    const foreignLog = await b.db
      .from('dose_logs')
      .insert({ medication_id: med.id, scheduled_at: new Date().toISOString(), status: 'taken' })
    expect(foreignLog.error).not.toBeNull()

    // Without any session (anon key only) the tables are closed.
    const noSession = createClient(url, key, { auth: { persistSession: false } })
    expect((await noSession.from('medications').select('id')).error).not.toBeNull()

    // The row is unchanged for its owner.
    const after = await a.db.from('medications').select('name').eq('id', med.id).single()
    expect(after.data?.name).toBe('RLS test medicine')
  } finally {
    // Clean up (dose logs go with the medication).
    await a.db.from('medications').delete().eq('id', med.id)
  }
})
