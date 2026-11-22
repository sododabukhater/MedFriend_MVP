import { expect, test, type Page } from '@playwright/test'
import { installEarlyClock, loginWithMeds, signUpInUI } from './helpers'

// Acceptance criteria: docs/specs/F8.md
// Fake clock: Wednesday 18 Nov 2026, 13:30 in Amman (10:30 UTC).
const FAKE_NOW = new Date('2026-11-18T10:30:00Z')

const progressTab = (page: Page) => page.getByRole('navigation').getByRole('button', { name: 'Progress' }).click()
const overall = (page: Page) => page.getByTestId('overall')
const period = (page: Page, name: string) => page.getByRole('group', { name: 'Period' }).getByRole('button', { name }).click()
const at8 = (day: number) => `2026-11-${String(day).padStart(2, '0')}T05:00:00Z` // 08:00 Amman

/**
 * Concor 08:00 daily, added 1 Nov 09:00 Amman (so its 1 Nov dose never counts).
 * Answers (8–18 Nov): 12, 13, 14, 18 taken on time; 15 taken 2 h late; 16 no answer (missed); 17 skipped.
 * Lipitor 20:00, added today 13:00: nothing decided yet.
 * → 7 days (12–18): 5 taken of 7 = 71%, 4 of 5 on time.  30 days: 2–18 Nov = 17 counted, 5 taken = 29%.
 */
async function setUp(page: Page) {
  const user = await loginWithMeds(
    page,
    [
      { name: 'Concor', times: ['08:00'], createdAt: '2026-11-01T06:00:00Z', strength: [5, 'mg'] },
      { name: 'Lipitor', times: ['20:00'], createdAt: '2026-11-18T10:00:00Z' },
    ],
    FAKE_NOW,
  )
  const { data: meds } = await user.db.from('medications').select('id, name')
  const concor = meds!.find((m) => m.name === 'Concor')!.id
  const log = (day: number, status: string, minutesLate = 5) => ({
    medication_id: concor,
    scheduled_at: at8(day),
    status,
    recorded_at: new Date(new Date(at8(day)).getTime() + minutesLate * 60_000).toISOString(),
  })
  const { error } = await user.db
    .from('dose_logs')
    .insert([log(12, 'taken'), log(13, 'taken'), log(14, 'taken'), log(15, 'taken', 120), log(17, 'skipped'), log(18, 'taken')])
  expect(error).toBeNull()
  await progressTab(page)
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible()
}

test('1 + 3. Overall adherence for 7 and 30 days follows the counting rules', async ({ page }) => {
  await setUp(page)
  await expect(page.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true')
  await expect(overall(page)).toContainText('You took 5 of 7 doses (71%).')
  // One bar per day; the last one is today.
  await expect(overall(page).getByRole('listitem')).toHaveCount(7)
  await expect(overall(page).getByRole('listitem').last()).toContainText('Today')
  await period(page, 'Last 30 days')
  await expect(overall(page)).toContainText('You took 5 of 17 doses (29%).')
  await expect(overall(page).getByRole('listitem')).toHaveCount(30)
})

test('2. Each medicine shows its own 7-day and 30-day % and "on time"', async ({ page }) => {
  await setUp(page)
  const concor = page.getByTestId('med-Concor')
  await expect(concor).toContainText('Concor 5 mg')
  await expect(concor.locator('.bar-value')).toHaveText('71%')
  await expect(concor).toContainText('4 of 5 taken on time (within 1 hour)')
  // Lipitor was added today and its first dose (20:00) has not come yet.
  await expect(page.getByTestId('med-Lipitor').locator('.bar-value')).toHaveText('—')
  await period(page, 'Last 30 days')
  await expect(concor.locator('.bar-value')).toHaveText('29%')
  await expect(page.getByTestId('med-Lipitor').locator('.bar-value')).toHaveText('—')
})

test('4. "See every dose" lists each dose by day, newest first; "Last 30 days" shows older days', async ({ page }) => {
  await setUp(page)
  await expect(page.locator('.log-date')).toHaveCount(0)
  await page.getByRole('button', { name: 'See every dose' }).click()
  const days = page.locator('.log-date')
  await expect(days).toHaveText([
    'Wednesday 18 November',
    'Tuesday 17 November',
    'Monday 16 November',
    'Sunday 15 November',
    'Saturday 14 November',
    'Friday 13 November',
    'Thursday 12 November',
  ])
  const items = page.locator('.log-item')
  await expect(items.nth(0)).toHaveText(/^08:00\s*Concor\s*Taken at 08:05$/)
  await expect(items.nth(1)).toHaveText(/^08:00\s*Concor\s*Skipped$/)
  await expect(items.nth(2)).toHaveText(/^08:00\s*Concor\s*Missed$/)
  await expect(items.nth(3)).toHaveText(/^08:00\s*Concor\s*Taken at 10:00$/)

  await period(page, 'Last 30 days')
  await expect(days).toHaveCount(17) // 2–18 Nov; 1 Nov was before Concor was added
  await expect(days.last()).toHaveText('Monday 2 November')
  await page.getByRole('button', { name: 'Hide the dose list' }).click()
  await expect(days).toHaveCount(0)
})

test('5. A brand-new account shows "Not enough data yet"', async ({ page }) => {
  await signUpInUI(page)
  await progressTab(page)
  await expect(overall(page)).toHaveText('Not enough data yet')
  await period(page, 'Last 30 days')
  await expect(overall(page)).toHaveText('Not enough data yet')
})

test('6. Taking a dose on Today updates Progress', async ({ page }) => {
  await loginWithMeds(page, [{ name: 'Aspocid', times: ['08:00'], createdAt: '2026-11-17T04:00:00Z' }], FAKE_NOW)
  // 17 and 18 Nov 08:00: both missed so far.
  await progressTab(page)
  await expect(overall(page)).toContainText('You took 0 of 2 doses (0%).')

  await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
  await page.getByRole('listitem', { name: '08:00 Aspocid', exact: true }).getByRole('button').first().click()
  await page.getByRole('button', { name: 'I took it: Aspocid at 08:00' }).click()
  await expect(page.getByRole('listitem', { name: '08:00 Aspocid', exact: true })).toHaveAttribute('data-status', 'taken')

  await progressTab(page)
  await expect(overall(page)).toContainText('You took 1 of 2 doses (50%).')
})

test('7. The demo account shows 30 days of history', async ({ page }) => {
  await installEarlyClock(page) // no reminder panel in the way
  await page.goto('/')
  await page.getByRole('button', { name: 'Use the demo account' }).click()
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 20_000 })
  await progressTab(page)
  // Read only. The numbers depend on the day, so check that there is a real % and many counted doses.
  await period(page, 'Last 30 days')
  await expect(overall(page)).toContainText(/\d+%/)
  const sentence = await overall(page).locator('.overall-sentence').textContent()
  const total = Number(sentence!.match(/of (\d+) doses/)![1])
  expect(total).toBeGreaterThan(150)
})

test('8. Progress works in Arabic; text ≥ 18px and buttons ≥ 48px', async ({ page }) => {
  await setUp(page)
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await expect(page.getByRole('heading', { name: 'التقدّم' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'آخر 7 أيام' })).toHaveAttribute('aria-pressed', 'true')
  await expect(overall(page)).toContainText('أخذت 5 من 7 جرعة (71%).')
  await page.getByRole('button', { name: 'اعرض كل الجرعات' }).click()
  await expect(page.locator('.log-date').first()).toHaveText('الأربعاء، 18 تشرين الثاني')

  for (const button of await page.getByRole('button').all()) {
    expect(Math.round((await button.boundingBox())!.height)).toBeGreaterThanOrEqual(48)
  }
  const smallest = await page.evaluate(() => {
    let min = Infinity
    for (const el of document.querySelectorAll('.phone-frame *')) {
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
      if (hasText) min = Math.min(min, parseFloat(getComputedStyle(el).fontSize))
    }
    return min
  })
  expect(smallest).toBeGreaterThanOrEqual(18)
})

