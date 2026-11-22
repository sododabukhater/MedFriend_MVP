import { expect, test, type Page } from '@playwright/test'
import { goToMeds, loginWithMeds as loginAt, signUpInUI, type MedRow } from './helpers'

// Acceptance criteria: docs/specs/F2.md
// Most tests use a fake clock: Wednesday 18 Nov 2026, 13:30 in Amman (10:30 UTC).
const FAKE_NOW = new Date('2026-11-18T10:30:00Z')

const loginWithMeds = (page: Page, meds: MedRow[]) => loginAt(page, meds, FAKE_NOW)

const dose = (page: Page, label: string) => page.getByRole('listitem', { name: label, exact: true })
/** Tapping a dose row opens its buttons (Taken / Skip, or Undo). */
const openDose = (page: Page, label: string) => dose(page, label).getByRole('button').first().click()
const reminder = (page: Page) => page.getByRole('alertdialog')

test('1. After login the app opens on Today with today\'s date (Amman)', async ({ page }) => {
  await loginWithMeds(page, [{ name: 'Concor', times: ['08:00'] }])
  await expect(page.getByText('Wednesday 18 November')).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Today' })).toHaveAttribute('aria-current', 'page')
})

test('2 + 3. Doses are grouped Morning / Noon / Evening / Night, in time order; empty groups hidden', async ({ page }) => {
  await loginWithMeds(page, [
    { name: 'Glucophage', times: ['08:00', '14:00', '20:00'], strength: [500, 'mg'] },
    { name: 'Aspocid', times: ['07:30'] },
  ])
  const headings = page.locator('.day-part-title')
  await expect(headings).toHaveText(['Morning', 'Noon', 'Evening']) // no Night group

  const morning = page.locator('section', { has: page.getByRole('heading', { name: 'Morning' }) })
  await expect(morning.getByRole('listitem')).toHaveText([/07:30\s*Aspocid/, /08:00\s*Glucophage 500 mg/])
  await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Noon' }) })).toContainText('14:00')
  await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Evening' }) })).toContainText('20:00')
  await expect(dose(page, '08:00 Glucophage')).toContainText('1 tablet')
})

test('4. Statuses follow the clock: Missed, Due now, Upcoming; Due turns into Missed after 60 min', async ({ page }) => {
  await loginWithMeds(page, [
    { name: 'Glucophage', times: ['08:00', '20:00'] },
    { name: 'Aspocid', times: ['13:00'] },
    { name: 'Lipitor', times: ['22:00'] },
    // Added today at 13:20: its 09:00 dose was before it existed, so it is not "Missed".
    { name: 'Nexium', times: ['09:00'], createdAt: '2026-11-18T10:20:00Z' },
  ])
  await expect(dose(page, '08:00 Glucophage')).toHaveAttribute('data-status', 'missed')
  await expect(dose(page, '08:00 Glucophage')).toContainText('Missed')
  await expect(dose(page, '09:00 Nexium')).toHaveAttribute('data-status', 'open')
  await expect(dose(page, '09:00 Nexium')).not.toContainText('Missed')
  await expect(dose(page, '13:00 Aspocid')).toHaveAttribute('data-status', 'due')
  await expect(dose(page, '13:00 Aspocid')).toContainText('Due now')
  await expect(dose(page, '20:00 Glucophage')).toContainText('Upcoming')
  await expect(page.locator('.day-part-title')).toHaveText(['Morning', 'Noon', 'Evening', 'Night'])

  // 31 minutes later (14:01) the 13:00 dose is missed, without reloading.
  await page.clock.fastForward('31:00')
  await expect(dose(page, '13:00 Aspocid')).toHaveAttribute('data-status', 'missed')
})

test('5 + 6. Taken / Skip are saved (also after a refresh); Undo removes them; the summary counts', async ({ page }) => {
  await loginWithMeds(page, [
    { name: 'Glucophage', times: ['08:00', '20:00'] },
    { name: 'Aspocid', times: ['13:00'] },
  ])
  const summary = page.getByTestId('summary')
  await expect(summary).toHaveText('0 of 3 taken')

  // The 13:00 dose is due: its reminder panel covers the screen until it is answered.
  await reminder(page).getByRole('button', { name: 'I took it' }).click()
  await expect(dose(page, '13:00 Aspocid')).toContainText('Taken at 13:30')
  await openDose(page, '08:00 Glucophage')
  await page.getByRole('button', { name: 'Skip: Glucophage at 08:00' }).click()
  await expect(dose(page, '08:00 Glucophage')).toContainText('Skipped')
  // A dose can also be taken before its time.
  await openDose(page, '20:00 Glucophage')
  await page.getByRole('button', { name: 'I took it: Glucophage at 20:00' }).click()
  await expect(summary).toHaveText('2 of 3 taken')

  await page.reload()
  await expect(dose(page, '13:00 Aspocid')).toHaveAttribute('data-status', 'taken')
  await expect(dose(page, '08:00 Glucophage')).toHaveAttribute('data-status', 'skipped')
  await expect(summary).toHaveText('2 of 3 taken')

  await openDose(page, '13:00 Aspocid')
  await page.getByRole('button', { name: 'Undo: Aspocid at 13:00' }).click()
  await expect(dose(page, '13:00 Aspocid')).toHaveAttribute('data-status', 'due')
  await page.reload()
  await expect(dose(page, '13:00 Aspocid')).toHaveAttribute('data-status', 'due')
  await expect(summary).toHaveText('1 of 3 taken')
})

test('A new medicine shows on Today right away; empty Today offers Add medication', async ({ page }) => {
  await signUpInUI(page) // 03:00 today
  await page.getByRole('button', { name: 'Add a medicine' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Ventolin')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Inhaler' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: '4 times a day' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Skip for now' }).click() // F7 box step
  await page.getByRole('button', { name: 'Skip for now' }).click() // F4 photo step
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(page.getByRole('heading', { name: 'My medicines' })).toBeVisible()

  await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
  await expect(page.locator('.dose')).toHaveCount(4)
  await expect(page.getByTestId('summary')).toHaveText('0 of 4 taken')

  // Deleting it empties Today again.
  await goToMeds(page)
  await page.getByRole('button', { name: 'Delete Ventolin' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
  await expect(page.getByText('No doses today. Add a medicine to see your doses.')).toBeVisible()
})

test('Saving a dose offline shows a clear message', async ({ page }) => {
  await loginWithMeds(page, [{ name: 'Aspocid', times: ['13:00'] }])
  await page.route('**/rest/v1/dose_logs**', (route) => route.abort())
  await reminder(page).getByRole('button', { name: 'I took it' }).click()
  await expect(reminder(page).getByRole('alert')).toContainText('Could not save')
  await expect(dose(page, '13:00 Aspocid')).toHaveAttribute('data-status', 'due')
})

test('7. Today works in Arabic; text ≥ 18px and buttons ≥ 48px', async ({ page }) => {
  await loginWithMeds(page, [{ name: 'جلوكوفاج', times: ['08:00', '13:00'], strength: [500, 'mg'] }])
  // The 13:00 reminder panel covers the language button: choose Arabic (saved per device) and reload.
  await page.evaluate(() => localStorage.setItem('medfriend.lang', 'ar'))
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'اليوم' })).toBeVisible()
  await expect(page.getByText('الأربعاء، 18 تشرين الثاني')).toBeVisible()
  await expect(page.locator('.day-part-title')).toHaveText(['الصباح', 'الظهر'])
  await expect(dose(page, '08:00 جلوكوفاج')).toContainText('500 ملغ')
  await expect(dose(page, '08:00 جلوكوفاج')).toContainText('فاتت')
  await reminder(page).getByRole('button', { name: 'أخذتها' }).click()
  await expect(dose(page, '13:00 جلوكوفاج')).toContainText('أُخذت الساعة 13:30')
  await expect(page.getByTestId('summary')).toHaveText('الجرعات المأخوذة: 1 من 2')

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
