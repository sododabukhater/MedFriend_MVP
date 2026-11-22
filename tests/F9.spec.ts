import { expect, test, type Page } from '@playwright/test'
import { goToSettings, installEarlyClock, loginWithMeds, openLoggedOut } from './helpers'

// Acceptance criteria: docs/specs/F9.md
// Fake clock: Wednesday 18 Nov 2026, 13:30 in Amman (10:30 UTC). No dose is due then, so no reminder panel.
const FAKE_NOW = new Date('2026-11-18T10:30:00Z')
const at8 = (day: number) => `2026-11-${String(day).padStart(2, '0')}T05:00:00Z` // 08:00 Amman

const progressTab = (page: Page) => page.getByRole('navigation').getByRole('button', { name: 'Progress' }).click()
const summaryPage = (page: Page) => page.getByTestId('summary-page')
const patient = (page: Page) => page.getByTestId('patient-name')
const medRow = (page: Page, name: string) => summaryPage(page).locator('.doc-meds tbody tr', { hasText: name })
const stat = (page: Page, i: number) => summaryPage(page).locator('.doc-stat').nth(i)

async function openSummary(page: Page) {
  await progressTab(page)
  await page.getByRole('button', { name: 'Summary for my doctor' }).click()
  await expect(page.getByRole('heading', { name: 'Medication summary' })).toBeVisible()
}

async function fillDetails(page: Page, name: string, year: string) {
  await page.getByLabel('Your name').fill(name)
  await page.getByLabel('Year of birth (optional)').fill(year)
  await page.getByRole('button', { name: 'Save my details' }).click()
}

/** Same history as tests/F8.spec.ts: Concor 7 days 5 of 7 (71%), 30 days 5 of 17 (29%). */
async function setUp(page: Page) {
  const user = await loginWithMeds(
    page,
    [
      { name: 'Concor', times: ['08:00'], createdAt: '2026-11-01T06:00:00Z', strength: [5, 'mg'] },
      { name: 'Glucophage', times: ['08:00', '20:00'], createdAt: '2026-11-18T10:00:00Z', strength: [500, 'mg'] },
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
  return user
}

test('1. Settings → My details: name and year of birth are saved and stay after a refresh', async ({ page }) => {
  await loginWithMeds(page, [], FAKE_NOW)
  await goToSettings(page)
  await expect(page.getByRole('heading', { name: 'My details' })).toBeVisible()

  await fillDetails(page, '   ', '')
  await expect(page.getByRole('alert')).toHaveText('Please type your name.')
  await fillDetails(page, 'Sami Haddad', '1850')
  await expect(page.getByRole('alert')).toHaveText('Type a year between 1900 and this year, or leave it empty.')
  // Arabic digits are accepted and turned into 0-9.
  await page.getByLabel('Year of birth (optional)').fill('١٩٦٨')
  await expect(page.getByLabel('Year of birth (optional)')).toHaveValue('1968')
  await page.getByRole('button', { name: 'Save my details' }).click()
  await expect(page.getByText('Your details are saved.')).toBeVisible()

  await page.reload()
  await goToSettings(page)
  await expect(page.getByLabel('Your name')).toHaveValue('Sami Haddad')
  await expect(page.getByLabel('Year of birth (optional)')).toHaveValue('1968')
})

test('2. The summary shows the patient, every medicine, 7- and 30-day figures and each medicine\'s %', async ({ page }) => {
  await setUp(page)
  await goToSettings(page)
  await fillDetails(page, 'Sami Haddad', '1968')
  await expect(page.getByText('Your details are saved.')).toBeVisible()

  await openSummary(page)
  const s = summaryPage(page)
  await expect(patient(page)).toHaveText('Sami Haddad')
  await expect(s).toContainText('1968 (58 years old)')
  await expect(s.locator('.doc-date')).toHaveText('Wednesday 18 November')
  await expect(s.locator('.doc-brand')).toContainText('Med Friend')
  await expect(s.locator('.doc-meds tbody tr')).toHaveCount(2)
  for (const text of ['Concor 5 mg', '1 tablet', 'once a day', '08:00']) await expect(medRow(page, 'Concor')).toContainText(text)
  for (const text of ['Glucophage 500 mg', 'twice a day', '08:00, 20:00']) await expect(medRow(page, 'Glucophage')).toContainText(text)
  for (const text of ['Last 7 days', '71%', '5 of 7 doses']) await expect(stat(page, 0)).toContainText(text)
  for (const text of ['Last 30 days', '29%', '5 of 17 doses']) await expect(stat(page, 1)).toContainText(text)
  await expect(s.locator('.doc-permed tbody tr')).toHaveText([
    /Concor 5 mg\s*5 of 17 doses\s*29%/,
    /Glucophage 500 mg\s*Not enough data yet\s*—/,
  ])
  await expect(s).toContainText('Recorded by the patient in Med Friend. Not medical advice.')
  // The name form is only shown when no name is saved.
  await expect(page.getByLabel('Your name')).toHaveCount(0)

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible()
})

test('3. No name yet: the summary asks for it, and saving it there also fills My details', async ({ page }) => {
  await setUp(page)
  await openSummary(page)
  await expect(page.getByText('Add your name so the doctor knows whose list this is.')).toBeVisible()
  await expect(patient(page)).toHaveText('Not added')

  await fillDetails(page, 'Layla Khoury', '')
  await expect(patient(page)).toHaveText('Layla Khoury')
  await expect(summaryPage(page).locator('.doc-patient dd').nth(1)).toHaveText('Not added')
  await expect(page.getByLabel('Your name')).toHaveCount(0)

  await page.getByRole('button', { name: 'Back' }).click()
  await goToSettings(page)
  await expect(page.getByLabel('Your name')).toHaveValue('Layla Khoury')
})

test('4. Print / Save as PDF opens the print window; the printed page has no buttons, tabs or frame', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { printed: number }
    w.printed = 0
    window.print = () => {
      w.printed++
    }
  })
  await setUp(page)
  await openSummary(page)
  await page.getByRole('button', { name: 'Print or save as PDF' }).click()
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1)

  await page.emulateMedia({ media: 'print' })
  await expect(summaryPage(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeHidden()
  await expect(page.getByRole('link', { name: 'Send on WhatsApp' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Back' })).toBeHidden()
  await expect(page.locator('.phone-frame')).toHaveCSS('border-top-width', '0px')

  // The logo is in the top-right corner of the page.
  const logo = (await page.locator('.doc-brand .logo-mark').boundingBox())!
  const doc = (await summaryPage(page).boundingBox())!
  expect(logo.y - doc.y).toBeLessThan(100)
  expect(logo.x).toBeGreaterThan(doc.x + doc.width * 0.5)

  // It fits on one A4 page.
  const pdf = (await page.pdf({ format: 'A4', preferCSSPageSize: true })).toString('latin1')
  expect(pdf.match(/\/Type\s*\/Page[^s]/g)).toHaveLength(1)
})

test('5. Send on WhatsApp opens a wa.me link with the summary as text', async ({ page }) => {
  await setUp(page)
  await goToSettings(page)
  await fillDetails(page, 'Sami Haddad', '1968')
  await expect(page.getByText('Your details are saved.')).toBeVisible()
  await openSummary(page)

  const link = page.getByRole('link', { name: 'Send on WhatsApp' })
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/)
  // Wait until the history has loaded (the figures are in the text).
  await expect(link).not.toHaveAttribute('aria-disabled', 'true')
  const href = (await link.getAttribute('href'))!
  const text = decodeURIComponent(href.split('?text=')[1])
  for (const part of [
    '*Medication summary*',
    'Patient: Sami Haddad',
    'Born 1968 (58 years old)',
    '- Concor 5 mg: 1 tablet, once a day: 08:00',
    'Last 7 days: 5 of 7 doses (71%)',
    'Last 30 days: 5 of 17 doses (29%)',
    '- Concor 5 mg: 29%',
    'Not medical advice.',
  ]) {
    expect(text).toContain(part)
  }
})

test('6. The summary works in Arabic; text ≥ 18px and buttons ≥ 48px', async ({ page }) => {
  await setUp(page)
  await goToSettings(page)
  await fillDetails(page, 'سامي حداد', '1968')
  await expect(page.getByText('Your details are saved.')).toBeVisible()
  await openSummary(page)
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  const s = summaryPage(page)
  await expect(page.getByRole('heading', { name: 'ملخّص الأدوية' })).toBeVisible()
  await expect(patient(page)).toHaveText('سامي حداد')
  await expect(s).toContainText('1968 (العمر 58 سنة)')
  for (const text of ['آخر 7 أيام', '71%', '5 من 7 جرعة']) await expect(stat(page, 0)).toContainText(text)
  // The logo stays in the top-right corner in Arabic too.
  const logo = (await page.locator('.doc-brand .logo-mark').boundingBox())!
  const doc = (await s.boundingBox())!
  expect(logo.x).toBeGreaterThan(doc.x + doc.width * 0.5)
  await expect(page.getByRole('link', { name: 'أرسل عبر واتساب' })).toBeVisible()

  for (const el of await page.locator('button, a').all()) {
    expect(Math.round((await el.boundingBox())!.height)).toBeGreaterThanOrEqual(48)
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

test('1b. A name saved on another device shows after a refresh (the saved login is not stale)', async ({ page }) => {
  const user = await loginWithMeds(page, [], FAKE_NOW)
  // "Another device": the same account, outside this browser.
  const { error } = await user.db.auth.updateUser({ data: { full_name: 'Omar Saleh', birth_year: 1971 } })
  expect(error).toBeNull()
  await page.reload()
  await goToSettings(page)
  await expect(page.getByLabel('Your name')).toHaveValue('Omar Saleh')
  await expect(page.getByLabel('Year of birth (optional)')).toHaveValue('1971')
})

test('7. The demo account has a sample name on its summary', async ({ page }) => {
  await installEarlyClock(page) // no reminder panel in the way
  await openLoggedOut(page)
  await page.getByRole('button', { name: 'Use the demo account' }).click()
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 20_000 })
  await openSummary(page) // read only
  await expect(patient(page)).toHaveText('مريض تجريبي (Demo patient)')
  await expect(summaryPage(page)).toContainText('1968')
})
