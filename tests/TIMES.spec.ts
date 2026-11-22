import { expect, test, type Page } from '@playwright/test'
import { goToMeds, goToSettings, loginWithMeds } from './helpers'

// Acceptance criteria: docs/specs/TIMES.md (changing a medicine's times or a meal time never changes the history).
// Fake clock: Wednesday 18 Nov 2026, 13:30 in Amman (10:30 UTC). No dose is due then, so no reminder panel.
const FAKE_NOW = new Date('2026-11-18T10:30:00Z')

const card = (page: Page, name: string) => page.getByRole('listitem', { name })
const dose = (page: Page, label: string) => page.getByRole('listitem', { name: label, exact: true })
const tab = (page: Page, name: string) => page.getByRole('navigation').getByRole('button', { name }).click()
const overall = (page: Page) => page.getByTestId('overall')
const save = (page: Page) => page.getByRole('button', { name: 'Save new times' })

/** One medicine added 15 Nov (09:00 Amman), taken on 16, 17 and 18 Nov at its time (+5 min). */
async function setUp(page: Page, name: string, time: string, anchor = '') {
  const user = await loginWithMeds(
    page,
    [{ name, times: [time], anchors: [anchor], createdAt: '2026-11-15T06:00:00Z' }],
    FAKE_NOW,
  )
  const { data: med } = await user.db.from('medications').select('id').single()
  const [h, m] = time.split(':').map(Number)
  const logs = [16, 17, 18].map((day) => {
    const at = new Date(Date.UTC(2026, 10, day, h - 3, m)) // Amman = UTC+3
    return { medication_id: med!.id, scheduled_at: at.toISOString(), status: 'taken', recorded_at: new Date(at.getTime() + 5 * 60_000).toISOString() }
  })
  const { error } = await user.db.from('dose_logs').insert(logs)
  expect(error).toBeNull()
  await page.reload()
  await expect(dose(page, `${time} ${name}`)).toHaveAttribute('data-status', 'taken')
  return user
}

test('1. Change times: new times start tomorrow; today and the history keep the old times', async ({ page }) => {
  await setUp(page, 'Concor', '08:00')
  await goToMeds(page)
  await page.getByRole('button', { name: 'Change times for Concor' }).click()
  await expect(page.getByRole('heading', { name: 'New times for Concor' })).toBeVisible()
  await expect(page.getByText('Doses you already answered stay as they are. The new times start tomorrow.')).toBeVisible()
  await expect(page.getByLabel('Time of dose 1')).toHaveValue('08:00')
  await expect(save(page)).toBeDisabled() // nothing changed yet
  await page.getByLabel('Time of dose 1').fill('09:00')
  await save(page).click()

  await expect(page.getByRole('status')).toHaveText('New times saved. They start tomorrow.')
  await expect(card(page, 'Concor').locator('.chip')).toHaveText(['09:00'])
  await expect(card(page, 'Concor')).toContainText('New times start tomorrow.')

  // Today keeps 08:00 (already taken); Progress still counts every earlier dose as taken.
  await tab(page, 'Today')
  await expect(dose(page, '08:00 Concor')).toHaveAttribute('data-status', 'taken')
  await expect(dose(page, '09:00 Concor')).toHaveCount(0)
  await tab(page, 'Progress')
  await expect(overall(page)).toContainText('You took 3 of 3 doses (100%).')

  // Saved: still the same after a reload.
  await page.reload()
  await expect(dose(page, '08:00 Concor')).toHaveAttribute('data-status', 'taken')

  // Tomorrow (19 Nov, 13:30): the dose is at 09:00 (not answered → missed); 16–18 Nov stay taken.
  await page.clock.fastForward('24:00:00')
  await expect(dose(page, '09:00 Concor')).toBeVisible()
  await expect(dose(page, '08:00 Concor')).toHaveCount(0)
  await goToMeds(page)
  await expect(card(page, 'Concor')).not.toContainText('New times start tomorrow.')
  await tab(page, 'Progress')
  await expect(overall(page)).toContainText('You took 3 of 4 doses (75%).')
})

test('2. Change times: times a day can change; Cancel saves nothing; two doses at the same time are refused', async ({ page }) => {
  await setUp(page, 'Glucophage', '08:00')
  await goToMeds(page)
  await page.getByRole('button', { name: 'Change times for Glucophage' }).click()
  await page.getByRole('button', { name: 'Twice a day' }).click()
  await page.getByLabel('Time of dose 2').fill('08:00')
  await expect(page.getByRole('alert')).toHaveText('Two doses are at the same time (08:00). Please choose different times.')
  await expect(save(page)).toBeDisabled()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(card(page, 'Glucophage').locator('.chip')).toHaveText(['08:00'])

  await page.getByRole('button', { name: 'Change times for Glucophage' }).click()
  await page.getByRole('button', { name: 'Twice a day' }).click()
  await expect(page.getByLabel('Time of dose 2')).toHaveValue('20:00')
  await save(page).click()
  await expect(card(page, 'Glucophage').locator('.chip')).toHaveText(['08:00', '20:00'])
  await expect(card(page, 'Glucophage')).toContainText('twice a day')

  // Today stays once a day; tomorrow has both doses.
  await tab(page, 'Today')
  await expect(page.getByTestId('summary')).toHaveText('1 of 1 taken')
  await page.clock.fastForward('24:00:00')
  await expect(dose(page, '20:00 Glucophage')).toBeVisible()
  await expect(page.getByTestId('summary')).toHaveText('0 of 2 taken')
})

test('3. Changing a meal time starts tomorrow; doses tied to the meal keep their history', async ({ page }) => {
  await setUp(page, 'Nexium', '07:30', 'breakfast:before')
  await goToSettings(page)
  await page.getByLabel('Breakfast').fill('09:00')
  await page.getByRole('button', { name: 'Save meal times' }).click()
  await expect(page.getByText('Meal times saved. The new times start tomorrow; today stays as it was.')).toBeVisible()

  await tab(page, 'Today')
  await expect(dose(page, '07:30 Nexium')).toHaveAttribute('data-status', 'taken')
  await tab(page, 'Progress')
  await expect(overall(page)).toContainText('You took 3 of 3 doses (100%).')
  await page.reload()
  await expect(dose(page, '07:30 Nexium')).toHaveAttribute('data-status', 'taken')

  // A second change on the same day: today still keeps the times it started with.
  await goToSettings(page)
  await page.getByLabel('Breakfast').fill('10:00')
  await page.getByRole('button', { name: 'Save meal times' }).click()
  await expect(page.getByText('Meal times saved. The new times start tomorrow; today stays as it was.')).toBeVisible()
  await tab(page, 'Today')
  await expect(dose(page, '07:30 Nexium')).toHaveAttribute('data-status', 'taken')

  // Tomorrow: before breakfast = 09:30 (10:00 − 30 min), not answered → missed; earlier days stay taken.
  await page.clock.fastForward('24:00:00')
  await expect(dose(page, '09:30 Nexium')).toContainText('Before breakfast')
  await tab(page, 'Progress')
  await expect(overall(page)).toContainText('You took 3 of 4 doses (75%).')
})

test('4. Arabic: Change times shows in Arabic, right to left', async ({ page }) => {
  await setUp(page, 'Concor', '08:00')
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByRole('navigation').getByRole('button', { name: 'أدويتي' }).click()
  await page.getByRole('button', { name: 'تغيير مواعيد Concor' }).click()
  await expect(page.getByRole('heading', { name: 'المواعيد الجديدة لدواء Concor' })).toBeVisible()
  await expect(page.getByText('الجرعات التي سجّلتها تبقى كما هي. تبدأ المواعيد الجديدة من الغد.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'احفظ المواعيد الجديدة' })).toBeDisabled()
  const size = await page.getByRole('button', { name: 'احفظ المواعيد الجديدة' }).evaluate((el) => el.getBoundingClientRect().height)
  expect(size).toBeGreaterThanOrEqual(48)
})
