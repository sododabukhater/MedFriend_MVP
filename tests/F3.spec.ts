import { expect, test, type Page } from '@playwright/test'
import { prayerTimes } from '../src/lib/prayer'
import { goToMeds, goToSettings, loginWithMeds } from './helpers'

// Acceptance criteria: docs/specs/F3.md
// Fake clock: Wednesday 18 Nov 2026, 13:30 in Amman (10:30 UTC). No dose is due then, so no reminder panel.
// Official Amman times that day (Jordan Ministry of Awqaf method): Fajr 05:43, Dhuhr 12:21, Asr 15:16,
// Maghrib 17:40, Isha 19:00. So "after Fajr" = 05:58 and "before breakfast" (08:00) = 07:30.
const FAKE_NOW = new Date('2026-11-18T10:30:00Z')

const prayerSwitch = (page: Page) => page.getByRole('switch', { name: 'Prayer and Ramadan times' })
const dose = (page: Page, label: string) => page.getByRole('listitem', { name: label, exact: true })
const doseBox = (page: Page, n: number) => page.getByRole('group', { name: `Dose ${n}`, exact: true })

/** Add medication up to the times step, with a number of doses per day. */
async function startAdding(page: Page, name: string, perDay: string) {
  await goToMeds(page)
  await page.getByRole('button', { name: 'Add a medicine' }).click()
  await page.getByRole('combobox', { name: 'Medicine name' }).fill(name)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Tablet', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: perDay }).click()
}

test('1. Prayer times for Amman match the official timetable (within 2 minutes)', async ({}, info) => {
  test.skip(info.project.name !== 'phone', 'runs once')
  // From the official method (Aladhan API, method 23 = Ministry of Awqaf, Jordan).
  const official: Record<string, Record<string, string>> = {
    '2026-11-18': { fajr: '05:43', sunrise: '07:07', dhuhr: '12:21', asr: '15:16', maghrib: '17:40', isha: '19:00' },
    '2026-06-21': { fajr: '03:51', sunrise: '05:31', dhuhr: '12:38', asr: '16:18', maghrib: '19:50', isha: '21:26' },
    '2027-03-21': { fajr: '05:18', sunrise: '06:39', dhuhr: '12:44', asr: '16:10', maghrib: '18:53', isha: '20:10' },
  }
  const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))
  for (const [date, times] of Object.entries(official)) {
    const ours = prayerTimes(date)
    for (const [prayer, time] of Object.entries(times)) {
      const diff = Math.abs(minutes(ours[prayer as keyof typeof ours]) - minutes(time))
      expect(diff, `${date} ${prayer}: ours ${ours[prayer as keyof typeof ours]}, official ${time}`).toBeLessThanOrEqual(2)
    }
  }
})

test('2. The prayer switch is off by default: only meal moments are offered', async ({ page }) => {
  await loginWithMeds(page, [], FAKE_NOW)
  await goToSettings(page)
  await expect(prayerSwitch(page)).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByTestId('prayer-today')).toHaveCount(0)

  await startAdding(page, 'Nexium', 'Once a day')
  await doseBox(page, 1).getByRole('button', { name: 'A moment in my day' }).click()
  await expect(doseBox(page, 1)).toContainText('Prayer and Ramadan times are off. You can turn them on in Settings.')
  await expect(page.getByRole('button', { name: 'After Fajr' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'With Iftar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Breakfast', exact: true })).toBeVisible()
  // No moment chosen yet: cannot go on.
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()
})

test('3. With the switch on: add "after Fajr" and "before breakfast"; Today, My medicines and the summary show them', async ({ page }) => {
  await loginWithMeds(page, [], FAKE_NOW)
  await goToSettings(page)
  await prayerSwitch(page).click()
  await expect(prayerSwitch(page)).toHaveAttribute('aria-checked', 'true')
  // Today's prayer times for Amman are listed.
  await expect(page.getByTestId('prayer-today')).toContainText('Fajr')
  await expect(page.getByTestId('prayer-today')).toContainText('05:43')
  // Saved with the account: still on after a refresh.
  await page.reload()
  await goToSettings(page)
  await expect(prayerSwitch(page)).toHaveAttribute('aria-checked', 'true')

  await startAdding(page, 'Concor', 'Twice a day')
  await doseBox(page, 1).getByRole('button', { name: 'A moment in my day' }).click()
  await doseBox(page, 1).getByRole('button', { name: 'After Fajr' }).click()
  await expect(page.getByTestId('anchor-1')).toHaveText('After Fajr: today at 05:58')
  await doseBox(page, 2).getByRole('button', { name: 'A moment in my day' }).click()
  await doseBox(page, 2).getByRole('button', { name: 'Breakfast', exact: true }).click()
  await expect(page.getByTestId('anchor-2')).toHaveText('With breakfast: today at 08:00')
  await doseBox(page, 2).getByRole('button', { name: 'Before', exact: true }).click()
  await expect(page.getByTestId('anchor-2')).toHaveText('Before breakfast: today at 07:30')
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('.review')).toContainText('After Fajr (05:58), Before breakfast (07:30)')
  await page.getByRole('button', { name: 'Save medication' }).click()

  // My medicines: the chips name the moments.
  const card = page.getByRole('listitem', { name: 'Concor' })
  await expect(card.locator('.chip')).toHaveText(['After Fajr', 'Before breakfast'])

  // Today: each dose at that day's time, with its moment.
  await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
  await expect(dose(page, '05:58 Concor')).toContainText('After Fajr')
  await expect(dose(page, '07:30 Concor')).toContainText('Before breakfast')

  // Doctor summary: the moments instead of clock times.
  await page.getByRole('navigation').getByRole('button', { name: 'Progress' }).click()
  await page.getByRole('button', { name: 'Summary for my doctor' }).click()
  await expect(page.getByTestId('summary-page').locator('.doc-meds')).toContainText('After Fajr, Before breakfast')
})

test('4. Changing a meal time moves the doses tied to that meal', async ({ page }) => {
  await loginWithMeds(page, [{ name: 'Nexium', times: ['07:30'], anchors: ['breakfast:before'] }], FAKE_NOW)
  await expect(dose(page, '07:30 Nexium')).toContainText('Before breakfast')

  await goToSettings(page)
  await page.getByLabel('Breakfast').fill('09:00')
  await page.getByRole('button', { name: 'Save meal times' }).click()
  await expect(page.getByText('Meal times saved.')).toBeVisible()

  await page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()
  await expect(dose(page, '08:30 Nexium')).toContainText('Before breakfast')
  await expect(dose(page, '07:30 Nexium')).toHaveCount(0)
  // Saved with the account.
  await page.reload()
  await expect(dose(page, '08:30 Nexium')).toBeVisible()
})

test('5. The reminder for "after Dhuhr" comes 15 minutes after Dhuhr and names the moment, even with the switch off', async ({ page }) => {
  // 12:36:45 in Amman, 15 seconds before Dhuhr (12:21) + 15 minutes.
  await loginWithMeds(page, [{ name: 'Aspocid', times: ['12:36'], anchors: ['dhuhr'] }], new Date('2026-11-18T09:36:45Z'))
  await page.clock.fastForward('00:20')
  const reminder = page.getByRole('alertdialog')
  await expect(reminder).toBeVisible()
  await expect(reminder).toContainText('12:36')
  await expect(reminder).toContainText('After Dhuhr')
  await expect(reminder).toContainText('Aspocid')
})

test('6. Arabic: Settings and the moment picker; text ≥ 18px and buttons ≥ 48px', async ({ page }) => {
  await loginWithMeds(page, [], FAKE_NOW)
  await goToSettings(page)
  await prayerSwitch(page).click()
  await expect(prayerSwitch(page)).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'العربية' }).click()
  await expect(page.getByRole('switch', { name: 'أوقات الصلاة ورمضان' })).toBeVisible()
  await expect(page.getByTestId('prayer-today')).toContainText('الفجر')

  await page.getByRole('navigation').getByRole('button', { name: 'أدويتي' }).click()
  await page.getByRole('button', { name: 'إضافة دواء' }).click()
  await page.getByRole('combobox', { name: 'اسم الدواء' }).fill('كونكور')
  await page.getByRole('button', { name: 'التالي' }).click()
  await page.getByRole('button', { name: 'حبوب' }).click()
  await page.getByRole('button', { name: 'التالي' }).click()
  await page.getByRole('button', { name: 'أكثر' }).click()
  await page.getByRole('button', { name: 'التالي' }).click()
  await page.getByRole('button', { name: 'مرة واحدة يومياً' }).click()
  await page.getByRole('button', { name: 'وقت من يومي' }).click()
  await page.getByRole('button', { name: 'بعد صلاة الفجر' }).click()
  await expect(page.getByTestId('anchor-1')).toHaveText('بعد صلاة الفجر: اليوم الساعة 05:58')
  await page.getByRole('button', { name: 'وجبة العشاء' }).click()
  await expect(page.getByTestId('anchor-1')).toHaveText('مع وجبة العشاء: اليوم الساعة 20:00')

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
