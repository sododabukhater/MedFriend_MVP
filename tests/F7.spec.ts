import { expect, test, type Page } from '@playwright/test'
import { goToMeds, loginWithMeds, signUpInUI } from './helpers'
import { checkStock, stockInfo } from '../src/lib/stock'
import type { Medication } from '../src/storage/medications'

// Acceptance criteria: docs/specs/F7.md (stock count + low-stock refill alert).
// 03:05 in Amman on 20 Nov 2026: no dose is due, so no reminder panel covers the screen.
const EARLY = new Date('2026-11-20T00:05:00Z')
// The box was counted the day before (19 Nov, 09:00 Amman).
const SET_AT = '2026-11-19T06:00:00Z'

const card = (page: Page, name: string) => page.getByRole('listitem', { name })
const stockOf = (page: Page, name: string) => card(page, name).getByTestId('stock')
const dose = (page: Page, label: string) => page.getByRole('listitem', { name: label, exact: true })
const openDose = (page: Page, label: string) => dose(page, label).getByRole('button').first().click()
const goToToday = (page: Page) => page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()

/** Add medication steps 1–4: a tablet, `taps` × "More" (0.5 each), twice a day. */
async function addUpToBox(page: Page, name: string, taps: number) {
  await page.getByRole('button', { name: 'Add a medicine' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill(name)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Tablet', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  for (let i = 0; i < taps; i++) await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Twice a day' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Step 5 of 6')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'The box' })).toBeVisible()
}

test('1. Add medication step 5 "The box": 100 in the box, left starts at 100; review and card show it', async ({ page }) => {
  await signUpInUI(page)
  await goToMeds(page)
  await addUpToBox(page, 'Glucophage', 4) // 2 tablets, twice a day = 4 a day
  await expect(page.getByRole('button', { name: 'Skip for now' })).toBeVisible()
  await page.getByLabel('How many are in one box?').fill('100')
  await expect(page.getByLabel('How many are left in the box you are using?')).toHaveValue('100')
  await expect(stockFieldUnits(page)).toHaveText(['tablets', 'tablets'])
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Skip for now' }).click() // photo
  await expect(page.getByText('100 tablets a box · 100 left')).toBeVisible()
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(stockOf(page, 'Glucophage')).toContainText('100 tablets left · about 25 days')
  await page.reload()
  await goToMeds(page)
  await expect(stockOf(page, 'Glucophage')).toContainText('100 tablets left · about 25 days')
})

const stockFieldUnits = (page: Page) => page.locator('.count-unit')

test('2. "Left now" cannot be more than the box; Skip for now saves without a count', async ({ page }) => {
  await signUpInUI(page)
  await goToMeds(page)
  await addUpToBox(page, 'Concor', 2)
  await page.getByLabel('How many are in one box?').fill('30')
  await page.getByLabel('How many are left in the box you are using?').fill('40')
  await expect(page.getByText('That is more than one box holds.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
  await page.getByLabel('How many are left in the box you are using?').fill('')
  await page.getByLabel('How many are in one box?').fill('')
  await page.getByRole('button', { name: 'Skip for now' }).click() // box
  await page.getByRole('button', { name: 'Skip for now' }).click() // photo
  await expect(page.getByText('Box', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(card(page, 'Concor').getByRole('button', { name: 'Set the box size for Concor' })).toBeVisible()
})

test('2b. Several boxes: 30 a box, 2 more full boxes, 18 left in the box in use = 78', async ({ page }) => {
  await signUpInUI(page)
  await goToMeds(page)
  await addUpToBox(page, 'Lipitor', 2) // 1 tablet, twice a day
  await page.getByLabel('How many are in one box?').fill('30')
  await page.getByRole('button', { name: 'More boxes' }).click()
  await page.getByRole('button', { name: 'More boxes' }).click()
  await expect(page.getByTestId('extra-boxes')).toHaveText('2')
  await page.getByLabel('How many are left in the box you are using?').fill('18')
  await expect(page.getByText('In total: 78 tablets')).toBeVisible()
  // The box in use still cannot hold more than one box.
  await page.getByLabel('How many are left in the box you are using?').fill('40')
  await expect(page.getByText('That is more than one box holds.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
  await page.getByLabel('How many are left in the box you are using?').fill('18')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Skip for now' }).click() // photo
  await expect(page.getByText('30 tablets a box · 78 left')).toBeVisible()
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(stockOf(page, 'Lipitor')).toContainText('78 tablets left · about 39 days')
})

test('3. Taken takes the amount off; Undo puts it back; Skip changes nothing; earlier days count too', async ({ page }) => {
  const user = await loginWithMeds(
    page,
    [{ name: 'Glucophage', times: ['20:00'], amount: 2, stock: { pack: 100, count: 100, setAt: SET_AT } }],
    EARLY,
  )
  // Yesterday's 20:00 dose was taken (2 tablets) → 98 left.
  const { data: med } = await user.db.from('medications').select('id').single()
  const { error } = await user.db.from('dose_logs').insert({
    medication_id: med!.id,
    scheduled_at: '2026-11-19T17:00:00Z',
    status: 'taken',
    recorded_at: '2026-11-19T17:05:00Z',
  })
  expect(error).toBeNull()
  await page.reload()
  await goToMeds(page)
  await expect(stockOf(page, 'Glucophage')).toContainText('98 tablets left')

  await goToToday(page)
  await openDose(page, '20:00 Glucophage')
  await page.getByRole('button', { name: 'I took it: Glucophage at 20:00' }).click()
  await goToMeds(page)
  await expect(stockOf(page, 'Glucophage')).toContainText('96 tablets left')

  await goToToday(page)
  await openDose(page, '20:00 Glucophage')
  await page.getByRole('button', { name: 'Undo: Glucophage at 20:00' }).click()
  await openDose(page, '20:00 Glucophage')
  await page.getByRole('button', { name: 'Skip: Glucophage at 20:00' }).click()
  await goToMeds(page)
  await expect(stockOf(page, 'Glucophage')).toContainText('98 tablets left')
})

test('4. 7 days or less: Low badge on the card and a refill card on Today that opens My medicines', async ({ page }) => {
  await loginWithMeds(
    page,
    [
      { name: 'Concor', times: ['08:00', '20:00'], stock: { pack: 30, count: 10, setAt: SET_AT } }, // 5 days
      { name: 'Lipitor', times: ['20:00'], stock: { pack: 30, count: 30, setAt: SET_AT } }, // 30 days
    ],
    EARLY,
  )
  const refills = page.getByTestId('refill')
  await expect(refills).toHaveCount(1)
  await expect(refills).toContainText('Concor: only about 5 days left.')
  await expect(refills).toContainText('Time to get a refill.')
  await refills.click()
  await expect(page.getByRole('heading', { name: 'My medicines' })).toBeVisible()
  await expect(stockOf(page, 'Concor')).toContainText('Low')
  await expect(stockOf(page, 'Concor')).toContainText('10 tablets left · about 5 days')
  await expect(stockOf(page, 'Lipitor')).not.toContainText('Low')
})

test('5. 0 left: Out of stock on the card and on Today', async ({ page }) => {
  await loginWithMeds(page, [{ name: 'Concor', times: ['20:00'], stock: { pack: 30, count: 0, setAt: SET_AT } }], EARLY)
  await expect(page.getByTestId('refill')).toContainText('Concor has run out.')
  await goToMeds(page)
  await expect(stockOf(page, 'Concor')).toContainText('Out of stock')
  await expect(stockOf(page, 'Concor')).toContainText('None left')
})

test('6. I got a new box adds one box; Correct the count sets the number; both stay after reload', async ({ page }) => {
  await loginWithMeds(page, [{ name: 'Concor', times: ['20:00'], stock: { pack: 30, count: 10, setAt: SET_AT } }], EARLY)
  await goToMeds(page)
  await page.getByRole('button', { name: 'I got a new box of Concor' }).click()
  await expect(page.getByText('Add one box of 30 tablets?')).toBeVisible()
  await page.getByRole('button', { name: 'Yes, add it' }).click()
  await expect(stockOf(page, 'Concor')).toContainText('40 tablets left · about 40 days')
  await page.reload()
  await goToMeds(page)
  await expect(stockOf(page, 'Concor')).toContainText('40 tablets left')

  await page.getByRole('button', { name: 'Correct the count of Concor' }).click()
  await expect(page.getByLabel('How many do you have now in total?')).toHaveValue('40') // more than one box is fine here
  await page.getByLabel('How many do you have now in total?').fill('25')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(stockOf(page, 'Concor')).toContainText('25 tablets left · about 25 days')
  await page.reload()
  await goToMeds(page)
  await expect(stockOf(page, 'Concor')).toContainText('25 tablets left')
})

test('7 + 8. A medicine without a box can be given one; the unit follows the form (ml, puffs)', async ({ page }) => {
  await loginWithMeds(
    page,
    [
      { name: 'Augmentin syrup', times: ['08:00', '20:00'], form: 'syrup', amount: 5 },
      { name: 'Ventolin', times: ['20:00'], form: 'inhaler', amount: 2, stock: { pack: 200, count: 200, setAt: SET_AT } },
    ],
    EARLY,
  )
  await goToMeds(page)
  await expect(stockOf(page, 'Ventolin')).toContainText('200 puffs left · about 100 days')
  await page.getByRole('button', { name: 'Set the box size for Augmentin syrup' }).click()
  await expect(stockFieldUnits(page)).toHaveText(['ml', 'ml'])
  await page.getByLabel('How many are in one box?').fill('100')
  await expect(page.getByLabel('How many are left in the box you are using?')).toHaveValue('100')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(stockOf(page, 'Augmentin syrup')).toContainText('100 ml left · about 10 days')
})

test('9. Arabic: the stock line and the refill card show in Arabic, right to left', async ({ page }) => {
  await loginWithMeds(page, [{ name: 'Concor', times: ['08:00', '20:00'], stock: { pack: 30, count: 10, setAt: SET_AT } }], EARLY)
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByTestId('refill')).toContainText('Concor: يكفي نحو 5 أيام فقط.')
  await expect(page.getByTestId('refill')).toContainText('حان وقت شراء علبة جديدة.')
  await page.getByRole('navigation').getByRole('button', { name: 'أدويتي' }).click()
  await expect(stockOf(page, 'Concor')).toContainText('قليل')
  await expect(stockOf(page, 'Concor')).toContainText('بقي 10 حبات · يكفي نحو 5 أيام')
})

test('10. Counting rules (pure): days, levels and the box checks', () => {
  const med = { id: 'm', amount: 1.5, timesPerDay: 2, packSize: 20, stockCount: 20, stockSetAt: new Date() } as Medication
  expect(stockInfo(med, 0)).toEqual({ left: 20, days: 6, level: 'low' })
  expect(stockInfo(med, 14)).toEqual({ left: 0, days: 0, level: 'out' })
  expect(stockInfo({ ...med, stockCount: 90 } as Medication, 0)).toEqual({ left: 90, days: 30, level: 'ok' })
  expect(stockInfo({ ...med, packSize: null, stockCount: null } as Medication, 0)).toBeNull()
  expect(checkStock('', '', 0)).toEqual({ ok: true, empty: true })
  expect(checkStock('0', '0', 0)).toEqual({ ok: false, problem: 'stock.needPack' })
  expect(checkStock('30', '31', 0)).toEqual({ ok: false, problem: 'stock.tooMany' })
  expect(checkStock('30', '31', 2)).toEqual({ ok: false, problem: 'stock.tooMany' }) // the box in use: max one box
  expect(checkStock('30', '18', 2)).toEqual({ ok: true, empty: false, pack: 30, left: 78 })
  expect(checkStock('30', '31', null)).toEqual({ ok: true, empty: false, pack: 30, left: 31 }) // Correct the count
})

test('11. The reminder panel shows a refill line for a low medicine (not for one with enough left)', async ({ page }) => {
  // 08:05 in Amman: both 08:00 doses are due, Concor (low) first.
  const AT_DOSE = new Date('2026-11-20T05:05:00Z')
  await loginWithMeds(
    page,
    [
      { name: 'Concor', times: ['08:00', '20:00'], stock: { pack: 28, count: 10, setAt: SET_AT } }, // 5 days
      { name: 'Lipitor', times: ['08:00'], stock: { pack: 30, count: 30, setAt: SET_AT } }, // 30 days
    ],
    AT_DOSE,
  )
  const panel = page.getByRole('alertdialog')
  await expect(panel).toContainText('Concor')
  await expect(panel.getByTestId('reminder-refill')).toHaveText('Only about 5 days left. Time to get a refill.')
  await panel.getByRole('button', { name: 'I took it' }).click()
  await expect(panel).toContainText('Lipitor')
  await expect(panel.getByTestId('reminder-refill')).toHaveCount(0)
})

test('12. The reminder panel says when a medicine has run out (Arabic too)', async ({ page }) => {
  const AT_DOSE = new Date('2026-11-20T05:05:00Z')
  await loginWithMeds(page, [{ name: 'Concor', times: ['08:00'], stock: { pack: 28, count: 0, setAt: SET_AT } }], AT_DOSE)
  const panel = page.getByRole('alertdialog')
  await expect(panel.getByTestId('reminder-refill')).toHaveText('None left. Time to get a refill.')
  await page.evaluate(() => localStorage.setItem('medfriend.lang', 'ar'))
  await page.reload()
  await expect(page.getByRole('alertdialog').getByTestId('reminder-refill')).toHaveText('نفد هذا الدواء. حان وقت شراء علبة جديدة.')
})

test('13. Setting a box on the card: changing the box size keeps the number typed for "left"', async ({ page }) => {
  await loginWithMeds(page, [{ name: 'Concor', times: ['20:00'] }], EARLY)
  await goToMeds(page)
  await page.getByRole('button', { name: 'Set the box size for Concor' }).click()
  const left = page.getByLabel('How many are left in the box you are using?')
  await page.getByLabel('How many are in one box?').fill('30')
  await expect(left).toHaveValue('30') // a new box: full unless changed
  await left.fill('12')
  await page.getByLabel('How many are in one box?').fill('28')
  await expect(left).toHaveValue('12')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(stockOf(page, 'Concor')).toContainText('12 tablets left')
})

test('14. While earlier doses load (or loading fails) no stock number shows; then the right one does', async ({ page }) => {
  const user = await loginWithMeds(
    page,
    [{ name: 'Glucophage', times: ['20:00'], amount: 2, stock: { pack: 100, count: 100, setAt: SET_AT } }],
    EARLY,
  )
  const { data: med } = await user.db.from('medications').select('id').single()
  await user.db.from('dose_logs').insert({
    medication_id: med!.id,
    scheduled_at: '2026-11-19T17:00:00Z',
    status: 'taken',
    recorded_at: '2026-11-19T17:05:00Z',
  })
  // The first load of earlier taken doses fails; the app tries again by itself.
  let failed = 0
  await page.route(/\/rest\/v1\/dose_logs\?.*status=eq\.taken/, async (route) => {
    if (failed++ === 0) return route.abort()
    return route.continue()
  })
  await page.reload()
  await goToMeds(page)
  await expect(card(page, 'Glucophage')).toBeVisible()
  // Never the too-high 100, and never "Set the box size" for a medicine that has a box.
  await expect(stockOf(page, 'Glucophage')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Set the box size for Glucophage' })).toHaveCount(0)
  await expect(stockOf(page, 'Glucophage')).toContainText('98 tablets left', { timeout: 15_000 })
  expect(failed).toBeGreaterThanOrEqual(2)
})
