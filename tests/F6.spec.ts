import { expect, test, type Page } from '@playwright/test'
import { goToMeds, loginWithMeds, signUpInUI } from './helpers'
import ar from '../src/i18n/ar.json' with { type: 'json' }
import en from '../src/i18n/en.json' with { type: 'json' }
import { amountText, nameWithStrength } from '../src/lib/format'
import type { Form } from '../src/storage/medications'

// Acceptance criteria: docs/specs/F6.md. Each test signs up a brand-new, empty account.

async function openHome(page: Page) {
  await signUpInUI(page)
  await goToMeds(page)
  await expect(page.getByText('You have not added any medication yet.')).toBeVisible()
}

const next = (page: Page) => page.getByRole('button', { name: 'Next' })

type Med = { name: string; form: string; more: number; perDay: string }

/** Goes through all 4 steps and saves. */
async function addMed(page: Page, med: Med) {
  await page.getByRole('button', { name: 'Add a medicine' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill(med.name)
  await next(page).click()
  await page.getByRole('button', { name: med.form, exact: true }).click()
  await next(page).click()
  for (let i = 0; i < med.more; i++) await page.getByRole('button', { name: 'More' }).click()
  await next(page).click()
  await page.getByRole('button', { name: med.perDay }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'Skip for now' }).click() // F7 box step
  await page.getByRole('button', { name: 'Skip for now' }).click() // F4 photo step
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(page.getByRole('status')).toHaveText('Medication saved')
}

const card = (page: Page, name: string) => page.getByRole('listitem', { name })

test('1. "Add medication" opens step 1 with a large text box', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add a medicine' }).click()
  await expect(page.getByText('Step 1 of 6')).toBeVisible()
  await expect(page.getByRole('heading', { name: "What is the medicine's name?" })).toBeVisible()
  const box = page.getByRole('combobox', { name: 'Medicine name' })
  await expect(box).toBeFocused()
  expect(Math.round((await box.boundingBox())!.height)).toBeGreaterThanOrEqual(48)
})

test('2. Typing "glu" or "جلو" suggests Glucophage; tapping fills the box', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add a medicine' }).click()
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
  await expect(c).toContainText('2 capsules, twice a day')
  await expect(c.locator('.chip')).toHaveText(['08:00', '20:00'])
})

test('4. Next is disabled until each step is answered', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add a medicine' }).click()

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
  await page.getByRole('button', { name: 'Add a medicine' }).click()
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
  await page.getByRole('button', { name: 'Add a medicine' }).click()
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
  await page.getByRole('button', { name: 'Skip for now' }).click() // F7 box step
  await page.getByRole('button', { name: 'Skip for now' }).click() // F4 photo step
  await expect(page.getByRole('heading', { name: 'Check and save' })).toBeVisible()
  await expect(page.locator('.review')).toContainText('08:00, 13:30, 20:00')
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(card(page, 'Glucophage').locator('.chip')).toHaveText(['08:00', '13:30', '20:00'])
})

test('8 + 9. Three medicines all show, and are still there after a refresh', async ({ page }) => {
  await openHome(page)
  await addMed(page, { name: 'Concor', form: 'Tablet', more: 2, perDay: 'Once a day' })
  await addMed(page, { name: 'Ventolin', form: 'Inhaler', more: 2, perDay: '4 times a day' })
  await addMed(page, { name: 'Lantus', form: 'Injection', more: 10, perDay: 'Once a day' })

  await page.reload()
  await goToMeds(page) // the app opens on Today after a refresh
  await expect(page.locator('.phone-frame')).toHaveAttribute('data-auth', 'signedIn')
  await expect(page.locator('.med-card')).toHaveCount(3)
  await expect(card(page, 'Concor')).toContainText('1 tablet')
  await expect(card(page, 'Ventolin')).toContainText('2 puffs, 4 times a day')
  await expect(card(page, 'Ventolin').locator('.chip')).toHaveText(['08:00', '13:00', '18:00', '22:00'])
  await expect(card(page, 'Lantus')).toContainText('10 units')
})

test('10. Cancel at any step returns home without saving', async ({ page }) => {
  await openHome(page)
  // Steps reached before pressing Cancel: 1, 2, 3, 4 and the review screen.
  for (let reach = 1; reach <= 5; reach++) {
    await page.getByRole('button', { name: 'Add a medicine' }).click()
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
    await expect(page.getByRole('heading', { name: 'My medicines' })).toBeVisible()
    await expect(page.getByText('You have not added any medication yet.')).toBeVisible()
  }
  await page.reload()
  await goToMeds(page) // the app opens on Today after a refresh
  await expect(page.getByText('You have not added any medication yet.')).toBeVisible()
})

test('Back keeps the answers; the review screen shows everything', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add a medicine' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Crestor')
  await page.getByRole('textbox', { name: 'Strength number' }).fill('10')
  await page.getByRole('button', { name: 'mg', exact: true }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('combobox', { name: 'Medicine name' })).toHaveValue('Crestor')
  await expect(page.getByRole('textbox', { name: 'Strength number' })).toHaveValue('10')
  await expect(page.getByRole('button', { name: 'mg', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await next(page).click()
  await page.getByRole('button', { name: 'Tablet', exact: true }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'Once a day' }).click()
  await next(page).click()

  await page.getByRole('button', { name: 'Skip for now' }).click() // F7 box step
  await page.getByRole('button', { name: 'Skip for now' }).click() // F4 photo step
  const review = page.locator('.review')
  for (const text of ['Crestor', '10 mg', 'Tablet', '1 tablet', 'Once a day: 08:00']) {
    await expect(review).toContainText(text)
  }
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(card(page, 'Crestor')).toContainText('10 mg')
})

test('Strength takes only a clean number plus a unit from the list (both or neither)', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add a medicine' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Glucophage')
  const number = page.getByRole('textbox', { name: 'Strength number' })
  const mg = page.getByRole('button', { name: 'mg', exact: true })

  // Rubbish is dropped as you type: letters, spaces, a second decimal point.
  await number.fill('abc 8x5.0.5 mg')
  await expect(number).toHaveValue('85.05')
  // Arabic digits and the Arabic decimal sign become 0-9 and "."
  await number.fill('٥٠٠٫٥')
  await expect(number).toHaveValue('500.5')

  // A number without a unit: Next stays off and says why.
  await number.fill('500')
  await expect(next(page)).toBeDisabled()
  await expect(page.getByText('Choose a unit, or clear the number.')).toBeVisible()

  // A unit without a number (or 0): Next stays off.
  await number.fill('')
  await mg.click()
  await expect(next(page)).toBeDisabled()
  await expect(page.getByText('Type the number, or tap the unit again to clear it.')).toBeVisible()
  await number.fill('0')
  await expect(next(page)).toBeDisabled()

  // Tapping the chosen unit again clears it: no strength at all is fine (it is optional).
  await number.fill('')
  await mg.click()
  await expect(mg).toHaveAttribute('aria-pressed', 'false')
  await expect(next(page)).toBeEnabled()

  // Number + unit: fine, and saved as such.
  await number.fill('500')
  await mg.click()
  await expect(next(page)).toBeEnabled()
  await next(page).click()
  await page.getByRole('button', { name: 'Tablet', exact: true }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'Twice a day' }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'Skip for now' }).click() // F7 box step
  await page.getByRole('button', { name: 'Skip for now' }).click() // F4 photo step
  await page.getByRole('button', { name: 'Save medication' }).click()
  await expect(card(page, 'Glucophage')).toContainText('500 mg')

  // The unit follows the language.
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await expect(card(page, 'Glucophage')).toContainText('500 ملغ')
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
  await goToMeds(page) // the app opens on Today after a refresh
  await expect(page.getByText('You have not added any medication yet.')).toBeVisible()
})

test('Saving offline shows a clear message and keeps the answers', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add a medicine' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Offline test')
  await next(page).click()
  await page.getByRole('button', { name: 'Other' }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'More' }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'Once a day' }).click()
  await next(page).click()

  await page.route('**/rest/v1/medications**', (route) => route.abort())
  await page.getByRole('button', { name: 'Skip for now' }).click() // F7 box step
  await page.getByRole('button', { name: 'Skip for now' }).click() // F4 photo step
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
  await expect(page.getByText('الخطوة 1 من 6')).toBeVisible()
  await page.getByRole('combobox', { name: 'اسم الدواء' }).fill('جلو')
  await checkSizes()
  await page.getByRole('button', { name: /^Glucophage · / }).click()
  await page.getByRole('button', { name: 'التالي' }).click()

  await page.getByRole('button', { name: 'حبوب' }).click()
  await checkSizes()
  await page.getByRole('button', { name: 'التالي' }).click()

  await page.getByRole('button', { name: 'أكثر' }).click()
  await page.getByRole('button', { name: 'أكثر' }).click()
  await expect(page.getByTestId('amount')).toHaveText('حبة واحدة')
  await checkSizes()
  await page.getByRole('button', { name: 'التالي' }).click()

  await page.getByRole('button', { name: 'مرتين يومياً' }).click()
  await checkSizes()
  await page.getByRole('button', { name: 'التالي' }).click()

  await expect(page.getByRole('heading', { name: 'علبة الدواء' })).toBeVisible() // F7 box step
  await page.getByLabel('كم في العلبة الواحدة؟').fill('30')
  await expect(page.getByText('حبة', { exact: true }).first()).toBeVisible()
  await checkSizes()
  await page.getByRole('button', { name: 'التالي' }).click()

  await expect(page.getByRole('heading', { name: 'صوّر دواءك أو علبته' })).toBeVisible() // F4 photo step
  await checkSizes()
  await page.getByRole('button', { name: 'ليس الآن' }).click()

  await expect(page.getByRole('heading', { name: 'راجِع واحفظ' })).toBeVisible()
  await checkSizes()
  await page.getByRole('button', { name: 'حفظ الدواء' }).click()

  await expect(page.getByRole('status')).toHaveText('تم حفظ الدواء')
  await expect(card(page, 'جلوكوفاج')).toContainText('حبة واحدة، مرتين يومياً')
  await checkSizes()
})

test('6b. Two doses at the same time are not allowed', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: 'Add a medicine' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill('Concor')
  await next(page).click()
  await page.getByRole('button', { name: 'Tablet', exact: true }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await next(page).click()
  await page.getByRole('button', { name: 'Twice a day' }).click()
  await expect(next(page)).toBeEnabled()

  await page.getByLabel('Time of dose 2').fill('08:00')
  await expect(page.getByRole('alert')).toHaveText('Two doses are at the same time (08:00). Please choose different times.')
  await expect(next(page)).toBeDisabled()

  await page.getByLabel('Time of dose 2').fill('21:00')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(next(page)).toBeEnabled()
})

test('12. Arabic amounts follow the number (pure); English is unchanged', () => {
  const words = { ...en, ...ar } as Record<string, string>
  const tAr = (key: string, vars?: Record<string, string | number>) =>
    (words[key] ?? key).replace(/\{(\w+)\}/g, (m, k: string) => (vars && k in vars ? String(vars[k]) : m))
  const say = (form: Form, n: number) => amountText(tAr as never, form, n, 'ar')
  expect(say('tablet', 1)).toBe('حبة واحدة')
  expect(say('tablet', 2)).toBe('حبتان')
  expect(say('tablet', 3)).toBe('3 حبات')
  expect(say('tablet', 10)).toBe('10 حبات')
  expect(say('tablet', 11)).toBe('11 حبة')
  expect(say('tablet', 40)).toBe('40 حبة')
  expect(say('tablet', 0.5)).toBe('نصف حبة')
  expect(say('tablet', 1.5)).toBe('حبة ونصف')
  expect(say('tablet', 2.5)).toBe('حبتان ونصف')
  expect(say('capsule', 3)).toBe('3 كبسولات')
  expect(say('drops', 2)).toBe('نقطتان')
  expect(say('drops', 5)).toBe('5 نقاط')
  expect(say('inhaler', 1)).toBe('بخّة واحدة')
  expect(say('syrup', 1)).toBe('1 مل')
  expect(say('syrup', 5)).toBe('5 مل')
  const tEn = (key: string) => (en as Record<string, string>)[key] ?? key
  expect(amountText(tEn as never, 'tablet', 1, 'en')).toBe('1 tablet')
  expect(amountText(tEn as never, 'tablet', 2, 'en')).toBe('2 tablets')
})

test('13. Arabic: the strength stays with its unit after an English name (Glucophage 500 ملغ)', async ({ page }) => {
  // 07:00 in Amman: the 08:00 dose is the next one (top card), no reminder panel yet.
  await loginWithMeds(page, [{ name: 'Glucophage', times: ['08:00'], strength: [500, 'mg'] }], new Date('2026-11-18T04:00:00Z'))
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

  // Right to left: the name is read first (on the right), then «500 ملغ» to its left, all in one piece.
  const strengthLeftOfName = (bdi: ReturnType<Page['locator']>) =>
    bdi.evaluate((el) => {
      const nameNode = [...el.parentElement!.childNodes].find((n) => n.nodeType === 3 && n.textContent!.trim())!
      const range = document.createRange()
      range.selectNodeContents(nameNode)
      const name = range.getBoundingClientRect()
      const strength = el.getBoundingClientRect()
      return strength.right <= name.left + 1 && el.textContent!.trim() === '500 ملغ'
    })
  await expect(page.locator('.hero-name bdi')).toBeVisible()
  expect(await strengthLeftOfName(page.locator('.hero-name bdi'))).toBe(true)
  expect(await strengthLeftOfName(page.locator('.dose-name bdi').first())).toBe(true)
  await page.getByRole('navigation').getByRole('button', { name: 'أدويتي' }).click()
  expect(await strengthLeftOfName(page.locator('.med-name bdi'))).toBe(true)

  // Plain text (Progress bars, doctor summary, WhatsApp): invisible isolate marks in Arabic only.
  expect(nameWithStrength('Glucophage', '500 ملغ', 'ar')).toBe('Glucophage \u2068500 ملغ\u2069')
  expect(nameWithStrength('Glucophage', '500 mg', 'en')).toBe('Glucophage 500 mg')
  expect(nameWithStrength('Glucophage', '', 'ar')).toBe('Glucophage')
})
