import { expect, test, type Page } from '@playwright/test'
import { signUpInUI } from './helpers'

// Acceptance criteria: docs/specs/F6.md. Each test signs up a brand-new, empty account.

async function openHome(page: Page) {
  await signUpInUI(page)
}

const next = (page: Page) => page.getByRole('button', { name: 'Next' })

type Med = { name: string; form: string; more: number; perDay: string }

/** Goes through all 4 steps and saves. */
async function addMed(page: Page, med: Med) {
  await page.getByRole('button', { name: 'Add medication' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill(med.name)
  await next(page).click()
  await page.getByRole('button', { name: med.form, exact: true }).click()
  await next(page).click()
  for (let i = 0; i < med.more; i++) await page.getByRole('button', { name: 'More' }).click()
  await next(page).click()
  await page.getByRole('button', { name: med.perDay }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(page.getByRole('status')).toHaveText('Medication saved')
}

const card = (page: Page, name: string) => page.getByRole('listitem', { name })

test('1. "Add medication" opens step 1 with a large text box', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add medication' }).click()
  await expect(page.getByText('Step 1 of 4')).toBeVisible()
  await expect(page.getByRole('heading', { name: "What is the medicine's name?" })).toBeVisible()
  const box = page.getByRole('combobox', { name: 'Medicine name' })
  await expect(box).toBeFocused()
  expect(Math.round((await box.boundingBox())!.height)).toBeGreaterThanOrEqual(48)
})

test('2. Typing "glu" or "جلو" suggests Glucophage; tapping fills the box', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add medication' }).click()
  const box = page.getByRole('combobox', { name: 'Medicine name' })

  await box.fill('glu')
  const options = page.getByRole('option')
  expect(await options.count()).toBeLessThanOrEqual(6)
  await page.getByRole('button', { name: /^Glucophage · / }).click()
  await expect(box).toHaveValue('Glucophage')
  await expect(page.getByRole('listbox')).toHaveCount(0)

  // Arabic, with a letter variant: "جلو" finds جلوكوفاج
  await box.fill('جلو')
  await page.getByRole('button', { name: /^Glucophage · / }).click()
  await expect(box).toHaveValue('جلوكوفاج')

  // أ / ا are treated the same: "اماريل" finds أماريل
  await box.fill('اماريل')
  await expect(page.getByRole('button', { name: /^Amaryl · / })).toBeVisible()
})

test('3 + 7. A name not in the list can be used; saving shows the message and the new card', async ({ page }) => {
  await openHome(page)
  await addMed(page, { name: 'Test medicine', form: 'Capsule', more: 2, perDay: 'Twice a day' })
  const c = card(page, 'Test medicine')
  await expect(c).toBeVisible()
  await expect(c).toContainText('Capsule · 2 capsules · Twice a day')
  await expect(c).toContainText('08:00 · 20:00')
})

test('4. Next is disabled until each step is answered', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add medication' }).click()

  await expect(next(page)).toBeDisabled()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('   ')
  await expect(next(page)).toBeDisabled() // spaces only do not count
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Panadol')
  await next(page).click()

  await expect(next(page)).toBeDisabled()
  await page.getByRole('button', { name: 'Tablet', exact: true }).click()
  await next(page).click()

  // The amount starts at 0: the app never suggests a dose.
  await expect(page.getByTestId('amount')).toHaveText('0 tablets')
  await expect(next(page)).toBeDisabled()
  await page.getByRole('button', { name: 'More' }).click()
  await expect(page.getByTestId('amount')).toHaveText('0.5 tablets')
  await next(page).click()

  await expect(next(page)).toBeDisabled()
  await page.getByRole('button', { name: 'Once a day' }).click()
  await expect(next(page)).toBeEnabled()
})

test('5. Choosing Syrup changes the unit to ml', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add medication' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Cough syrup')
  await next(page).click()
  await page.getByRole('button', { name: 'Syrup' }).click()
  await next(page).click()
  await expect(page.getByTestId('amount')).toHaveText('0 ml')
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await expect(page.getByTestId('amount')).toHaveText('5 ml')
})

test('6. Choosing 3 times shows 08:00, 14:00, 20:00, each editable', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add medication' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Glucophage')
  await next(page).click()
  await page.getByRole('button', { name: 'Tablet', exact: true }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await next(page).click()
  await page.getByRole('button', { name: '3 times a day' }).click()

  await expect(page.getByLabel('Time of dose 1')).toHaveValue('08:00')
  await expect(page.getByLabel('Time of dose 2')).toHaveValue('14:00')
  await expect(page.getByLabel('Time of dose 3')).toHaveValue('20:00')
  await page.getByLabel('Time of dose 2').fill('13:30')

  await next(page).click()
  await expect(page.getByRole('heading', { name: 'Check and save' })).toBeVisible()
  await expect(page.locator('.review')).toContainText('08:00 · 13:30 · 20:00')
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(card(page, 'Glucophage')).toContainText('08:00 · 13:30 · 20:00')
})

test('8 + 9. Three medicines all show, and are still there after a refresh', async ({ page }) => {
  await openHome(page)
  await addMed(page, { name: 'Concor', form: 'Tablet', more: 2, perDay: 'Once a day' })
  await addMed(page, { name: 'Ventolin', form: 'Inhaler', more: 2, perDay: '4 times a day' })
  await addMed(page, { name: 'Lantus', form: 'Injection', more: 10, perDay: 'Once a day' })

  await page.reload()
  await expect(page.locator('.phone-frame')).toHaveAttribute('data-auth', 'signedIn')
  await expect(page.locator('.med-card')).toHaveCount(3)
  await expect(card(page, 'Concor')).toContainText('1 tablet')
  await expect(card(page, 'Ventolin')).toContainText('2 puffs · 4 times a day')
  await expect(card(page, 'Ventolin')).toContainText('08:00 · 13:00 · 18:00 · 22:00')
  await expect(card(page, 'Lantus')).toContainText('10 units')
})

test('10. Cancel at any step returns home without saving', async ({ page }) => {
  await openHome(page)
  // Steps reached before pressing Cancel: 1, 2, 3, 4 and the review screen.
  for (let reach = 1; reach <= 5; reach++) {
    await page.getByRole('button', { name: 'Add medication' }).click()
    if (reach > 1) {
      await page.getByRole('combobox', { name: 'Medicine name' }).fill('Not saved')
      await next(page).click()
    }
    if (reach > 2) {
      await page.getByRole('button', { name: 'Drops' }).click()
      await next(page).click()
    }
    if (reach > 3) {
      await page.getByRole('button', { name: 'More' }).click()
      await next(page).click()
    }
    if (reach > 4) {
      await page.getByRole('button', { name: 'Once a day' }).click()
      await next(page).click()
    }
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Med Friend' })).toBeVisible()
    await expect(page.getByText('You have not added any medication yet.')).toBeVisible()
  }
  await page.reload()
  await expect(page.getByText('You have not added any medication yet.')).toBeVisible()
})

test('Back keeps the answers; the review screen shows everything', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add medication' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Crestor')
  await page.getByLabel('Strength (optional), e.g. 500 mg').fill('10 mg')
  await next(page).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('combobox', { name: 'Medicine name' })).toHaveValue('Crestor')
  await expect(page.getByLabel('Strength (optional), e.g. 500 mg')).toHaveValue('10 mg')
  await next(page).click()
  await page.getByRole('button', { name: 'Tablet', exact: true }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'Once a day' }).click()
  await next(page).click()

  const review = page.locator('.review')
  for (const text of ['Crestor', '10 mg', 'Tablet', '1 tablet', 'Once a day: 08:00']) {
    await expect(review).toContainText(text)
  }
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(card(page, 'Crestor')).toContainText('10 mg')
})

test('Delete asks first; "Keep it" keeps the medicine, "Yes, delete" removes it for good', async ({ page }) => {
  await openHome(page)
  await addMed(page, { name: 'Plavix', form: 'Tablet', more: 2, perDay: 'Once a day' })

  await page.getByRole('button', { name: 'Delete Plavix' }).click()
  await expect(page.getByText('Delete Plavix? This cannot be undone.')).toBeVisible()
  await page.getByRole('button', { name: 'Keep it' }).click()
  await expect(card(page, 'Plavix')).toBeVisible()

  await page.getByRole('button', { name: 'Delete Plavix' }).click()
  await page.getByRole('button', { name: 'Yes, delete' }).click()
  await expect(page.getByRole('status')).toHaveText('Medication deleted')
  await expect(page.getByText('You have not added any medication yet.')).toBeVisible()

  await page.reload()
  await expect(page.getByText('You have not added any medication yet.')).toBeVisible()
})

test('Saving offline shows a clear message and keeps the answers', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add medication' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Offline test')
  await next(page).click()
  await page.getByRole('button', { name: 'Other' }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'More' }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'Once a day' }).click()
  await next(page).click()

  await page.route('**/rest/v1/medications**', (route) => route.abort())
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(page.getByRole('alert')).toContainText('Could not save')
  await expect(page.locator('.review')).toContainText('Offline test')

  await page.unroute('**/rest/v1/medications**')
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(card(page, 'Offline test')).toBeVisible()
})

test('11. Works in Arabic; text ≥ 18px and buttons ≥ 48px on every step', async ({ page }) => {
  async function checkSizes() {
    for (const button of await page.getByRole('button').all()) {
      const box = await button.boundingBox()
      expect(Math.round(box!.height)).toBeGreaterThanOrEqual(48)
    }
    const smallest = await page.evaluate(() => {
      let min = Infinity
      for (const el of document.querySelectorAll('.screen *')) {
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())
        if (hasText) min = Math.min(min, parseFloat(getComputedStyle(el).fontSize))
      }
      return min
    })
    expect(smallest).toBeGreaterThanOrEqual(18)
  }

  await openHome(page)
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

  await page.getByRole('button', { name: 'إضافة دواء' }).click()
  await expect(page.getByText('الخطوة 1 من 4')).toBeVisible()
  await page.getByRole('combobox', { name: 'اسم الدواء' }).fill('جلو')
  await checkSizes()
  await page.getByRole('button', { name: /^Glucophage · / }).click()
  await page.getByRole('button', { name: 'التالي' }).click()

  await page.getByRole('button', { name: 'حبوب' }).click()
  await checkSizes()
  await page.getByRole('button', { name: 'التالي' }).click()

  await page.getByRole('button', { name: 'أكثر' }).click()
  await page.getByRole('button', { name: 'أكثر' }).click()
  await expect(page.getByTestId('amount')).toHaveText('1 حبة')
  await checkSizes()
  await page.getByRole('button', { name: 'التالي' }).click()

  await page.getByRole('button', { name: 'مرتين يومياً' }).click()
  await checkSizes()
  await page.getByRole('button', { name: 'التالي' }).click()

  await expect(page.getByRole('heading', { name: 'راجِع واحفظ' })).toBeVisible()
  await checkSizes()
  await page.getByRole('button', { name: 'حفظ الدواء' }).click()

  await expect(page.getByRole('status')).toHaveText('تم حفظ الدواء')
  await expect(card(page, 'جلوكوفاج')).toContainText('حبوب · 1 حبة · مرتين يومياً')
  await checkSizes()
})
