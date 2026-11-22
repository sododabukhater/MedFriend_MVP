import { expect, test, type Page } from '@playwright/test'
import { goToMeds, goToSettings, loginWithMeds, openLoggedOut, type MedRow } from './helpers'

// Acceptance criteria: docs/specs/DESIGN.md (design revamp + Reset all data).
// Fake clock: Wednesday 18 Nov 2026, 13:30 in Amman (10:30 UTC).
const FAKE_NOW = new Date('2026-11-18T10:30:00Z')

const start = (page: Page, meds: MedRow[]) => loginWithMeds(page, meds, FAKE_NOW)
const hero = (page: Page) => page.getByTestId('hero')
const dose = (page: Page, label: string) => page.getByRole('listitem', { name: label, exact: true })
const reminder = (page: Page) => page.getByRole('alertdialog')

test('1. Today: the top card shows the dose due now in its part-of-day colour; "Remind me later" snoozes it', async ({ page }) => {
  await start(page, [
    { name: 'Aspocid', times: ['13:00'], strength: [81, 'mg'] },
    { name: 'Lipitor', times: ['20:00'] },
  ])
  // The reminder panel is open for the 13:00 dose; "Remind me in 15 minutes" closes it.
  await reminder(page).getByRole('button', { name: 'Remind me in 15 minutes' }).click()
  await expect(reminder(page)).toHaveCount(0)

  await expect(hero(page)).toHaveClass(/tint--noon/)
  await expect(hero(page)).toContainText('Reminder again at 13:45')
  await expect(hero(page)).toContainText('Aspocid 81 mg')
  await expect(hero(page)).not.toContainText('Remind me later') // only while due

  // Taking it moves the card to the next dose (evening colour).
  await hero(page).getByRole('button', { name: 'I took it' }).click()
  await expect(hero(page)).toContainText('Next dose, evening')
  await expect(hero(page)).toHaveClass(/tint--evening/)
  await expect(hero(page)).toContainText('20:00')
  await expect(dose(page, '13:00 Aspocid')).toHaveAttribute('data-status', 'taken')
})

test('2. Today: the top card shows the next dose; when every dose is answered the card says so', async ({ page }) => {
  await start(page, [{ name: 'Aspocid', times: ['08:00'] }, { name: 'Concor', times: ['14:00'] }])
  await expect(hero(page)).toContainText('Next dose, noon')
  await hero(page).getByRole('button', { name: 'Skip' }).click()
  await expect(dose(page, '14:00 Concor')).toHaveAttribute('data-status', 'skipped')
  await expect(hero(page)).toHaveCount(0)
  await expect(page.getByText('Every dose for today has an answer.')).toBeVisible()
})

test('3. Today: tapping a dose row opens its buttons; only one row is open at a time', async ({ page }) => {
  await start(page, [{ name: 'Aspocid', times: ['08:00'] }, { name: 'Concor', times: ['09:00'] }])
  const aspocid = dose(page, '08:00 Aspocid').getByRole('button').first()
  await expect(aspocid).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('button', { name: 'I took it: Aspocid at 08:00' })).toHaveCount(0)

  await aspocid.click()
  await expect(aspocid).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Skip: Aspocid at 08:00' })).toBeVisible()

  await dose(page, '09:00 Concor').getByRole('button').first().click()
  await expect(page.getByRole('button', { name: 'Skip: Aspocid at 08:00' })).toHaveCount(0)
  await page.getByRole('button', { name: 'I took it: Concor at 09:00' }).click()
  // The row closes and shows a tick with the time it was taken.
  await expect(dose(page, '09:00 Concor')).toContainText('Taken at 13:30')
  await expect(page.getByRole('button', { name: 'Undo: Concor at 09:00' })).toHaveCount(0)
  await expect(page.getByTestId('summary')).toHaveText('1 of 2 taken')
})

test('4. Day-part boxes have a coloured header (no capitals); the app uses Readex Pro', async ({ page }) => {
  await start(page, [{ name: 'Aspocid', times: ['08:00', '22:00'] }])
  const title = page.locator('.day-part-title').first()
  await expect(title).toHaveText('Morning')
  await expect(title).toHaveCSS('text-transform', 'none')
  await expect(page.locator('.band-head.tint--morning')).toBeVisible()
  await expect(page.locator('.band-head.tint--night')).toBeVisible()
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Readex Pro')
})

test('5. My medicines: count, "1 tablet, twice a day", time chips in day-part colours, Add button above the tabs', async ({ page }) => {
  await start(page, [
    { name: 'Glucophage', times: ['08:00', '20:00'], strength: [500, 'mg'] },
    { name: 'Concor', times: ['13:00'] },
  ])
  await reminder(page).getByRole('button', { name: 'I took it' }).click()
  await goToMeds(page)
  await expect(page.getByText('2 medicines')).toBeVisible()
  const card = page.getByRole('listitem', { name: 'Glucophage' })
  await expect(card).toContainText('Glucophage 500 mg')
  await expect(card).toContainText('1 tablet, twice a day')
  await expect(card.locator('.chip')).toHaveText(['08:00', '20:00'])
  await expect(card.locator('.chip').first()).toHaveClass(/tint--morning/)
  await expect(card.locator('.chip').last()).toHaveClass(/tint--evening/)

  // The Add button stays on screen just above the tab bar.
  const add = await page.getByRole('button', { name: 'Add a medicine' }).boundingBox()
  const tabs = await page.getByRole('navigation').boundingBox()
  expect(add!.y + add!.height).toBeLessThanOrEqual(tabs!.y)
})

test('6. Settings: Reset all data asks first; "Keep my data" keeps it; "Yes" deletes medicines and history', async ({ page }) => {
  const user = await start(page, [{ name: 'Aspocid', times: ['08:00'] }, { name: 'Concor', times: ['09:00'] }])
  await dose(page, '08:00 Aspocid').getByRole('button').first().click()
  await page.getByRole('button', { name: 'I took it: Aspocid at 08:00' }).click()
  await expect(dose(page, '08:00 Aspocid')).toHaveAttribute('data-status', 'taken')

  await goToSettings(page)
  await page.getByRole('button', { name: 'Reset all data' }).click()
  await expect(page.getByText('Delete all your medicines and your dose history? This cannot be undone.')).toBeVisible()
  await page.getByRole('button', { name: 'Keep my data' }).click()
  await goToMeds(page)
  await expect(page.locator('.med-card')).toHaveCount(2)

  await goToSettings(page)
  await page.getByRole('button', { name: 'Reset all data' }).click()
  await page.getByRole('button', { name: 'Yes, delete everything' }).click()
  await expect(page.getByRole('status')).toHaveText('All your data is deleted.')
  await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
  await expect(page.getByText('No doses today. Add a medicine to see your doses.')).toBeVisible()

  // Nothing is left in the database for this account.
  const meds = await user.db.from('medications').select('id')
  const logs = await user.db.from('dose_logs').select('id')
  expect(meds.data).toHaveLength(0)
  expect(logs.data).toHaveLength(0)
})

test('7. Settings: the shared demo account cannot be reset', async ({ page }) => {
  await openLoggedOut(page)
  await page.getByRole('button', { name: 'Use the demo account' }).click()
  await expect(page.locator('.phone-frame')).toHaveAttribute('data-auth', 'signedIn', { timeout: 20_000 })
  await goToSettings(page)
  await expect(page.getByText('The shared demo account cannot be reset.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reset all data' })).toHaveCount(0)
})

test('8. Settings: the language switch changes the whole app; text ≥ 18px and buttons ≥ 48px', async ({ page }) => {
  await start(page, [])
  await goToSettings(page)
  const language = page.getByRole('group', { name: 'Language' })
  await expect(language.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
  await language.getByRole('button', { name: 'العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'الإعدادات' })).toBeVisible()
  await page.getByRole('button', { name: 'حذف كل البيانات' }).click()
  await expect(page.getByRole('button', { name: 'نعم، احذف كل شيء' })).toBeVisible()

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

  await page.getByRole('group', { name: 'اللغة' }).getByRole('button', { name: 'English' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})
