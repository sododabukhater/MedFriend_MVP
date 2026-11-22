import { expect, test, type Page } from '@playwright/test'
import { goToSettings, loginWithMeds, type MedRow } from './helpers'

// Acceptance criteria: docs/specs/F1.md
// Fake clock: Wednesday 18 Nov 2026, 12:59:50 in Amman, 10 seconds before a 13:00 dose.
const FAKE_NOW = new Date('2026-11-18T09:59:50Z')

async function start(page: Page, meds: MedRow[]) {
  // Record vibrations instead of vibrating.
  await page.addInitScript(() => {
    const w = window as unknown as { vibrations: unknown[] }
    w.vibrations = []
    Object.defineProperty(navigator, 'vibrate', {
      value: (pattern: unknown) => {
        w.vibrations.push(pattern)
        return true
      },
    })
  })
  await loginWithMeds(page, meds, FAKE_NOW)
}

const banner = (page: Page) => page.getByRole('alertdialog')
const dose = (page: Page, label: string) => page.getByRole('listitem', { name: label, exact: true })
const vibrations = (page: Page) => page.evaluate(() => (window as unknown as { vibrations: unknown[] }).vibrations.length)
const today = (page: Page) => page.getByRole('navigation').getByRole('button', { name: 'Today' }).click()

test('1. At the dose time the reminder appears by itself, with chime/vibration and "(1)" in the tab title', async ({ page }) => {
  await start(page, [{ name: 'Aspocid', times: ['13:00'], strength: [81, 'mg'] }])
  await expect(banner(page)).toHaveCount(0)

  await page.clock.fastForward('00:15')
  await expect(banner(page)).toBeVisible()
  await expect(banner(page)).toContainText('Time for your noon medicine')
  for (const text of ['13:00', 'Aspocid 81 mg', '1 tablet']) await expect(banner(page)).toContainText(text)
  // Shown as a panel tinted with the colour of its part of the day.
  await expect(banner(page)).toHaveClass(/tint--noon/)
  await expect(banner(page).getByRole('button', { name: 'I took it' })).toBeFocused()
  await expect(page).toHaveTitle('(1) Med Friend')
  expect(await vibrations(page)).toBe(1)
})

test('2. Taken / Skip in the reminder are saved and close it', async ({ page }) => {
  await start(page, [
    { name: 'Aspocid', times: ['13:00'] },
    { name: 'Concor', times: ['13:00'] },
  ])
  await page.clock.fastForward('00:15')
  await banner(page).getByRole('button', { name: 'I took it' }).click()
  await expect(dose(page, '13:00 Aspocid')).toContainText('Taken at 13:00')

  await banner(page).getByRole('button', { name: 'Skip' }).click()
  await expect(banner(page)).toHaveCount(0)
  await expect(dose(page, '13:00 Concor')).toContainText('Skipped')
  await expect(page).toHaveTitle('Med Friend')

  await page.reload()
  await expect(dose(page, '13:00 Aspocid')).toHaveAttribute('data-status', 'taken')
  await expect(banner(page)).toHaveCount(0)
})

test('3. Snooze hides the reminder; it comes back after 15 minutes', async ({ page }) => {
  await start(page, [{ name: 'Aspocid', times: ['13:00'] }])
  await page.clock.fastForward('00:15')
  await banner(page).getByRole('button', { name: 'Remind me in 15 minutes' }).click()
  await expect(banner(page)).toHaveCount(0)
  await expect(dose(page, '13:00 Aspocid')).toContainText('Snoozed until 13:15')

  await page.clock.fastForward('14:00')
  await expect(banner(page)).toHaveCount(0)
  await page.clock.fastForward('01:10')
  await expect(banner(page)).toBeVisible()
  await expect(banner(page)).toHaveAttribute('data-stage', 'first')
})

test('4. No answer: a second reminder after 15 min; after 60 min it goes and the dose is Missed', async ({ page }) => {
  await start(page, [{ name: 'Aspocid', times: ['13:00'] }])
  await page.clock.fastForward('00:15')
  await expect(banner(page)).toHaveAttribute('data-stage', 'first')

  await page.clock.fastForward('15:00')
  await expect(banner(page)).toHaveAttribute('data-stage', 'followUp')
  await expect(banner(page)).toContainText('Second reminder: did you take it?')
  expect(await vibrations(page)).toBe(2)

  await page.clock.fastForward('45:00')
  await expect(banner(page)).toHaveCount(0)
  await expect(dose(page, '13:00 Aspocid')).toHaveAttribute('data-status', 'missed')
})

test('5. Several doses due at once are shown one at a time ("1 of 2")', async ({ page }) => {
  await start(page, [
    { name: 'Aspocid', times: ['13:00'] },
    { name: 'Glucophage', times: ['13:00'] },
  ])
  await page.clock.fastForward('00:15')
  await expect(banner(page)).toContainText('1 of 2')
  await expect(banner(page)).toContainText('Aspocid')
  await expect(page).toHaveTitle('(2) Med Friend')

  await banner(page).getByRole('button', { name: 'I took it' }).click()
  await expect(banner(page)).toContainText('Glucophage')
  await expect(banner(page)).not.toContainText('1 of')
})

test('6. Settings: Demo speed is remembered; "Show the next reminder now" runs the whole flow in seconds', async ({ page }) => {
  await start(page, [
    { name: 'Lipitor', times: ['20:00'] },
    { name: 'Nexium', times: ['22:00'] },
  ])
  await goToSettings(page)
  const demo = page.getByRole('switch', { name: 'Demo speed' })
  await expect(demo).toHaveAttribute('aria-checked', 'false')
  await demo.click()
  await expect(demo).toHaveAttribute('aria-checked', 'true')
  await page.reload()
  await goToSettings(page)
  await expect(demo).toHaveAttribute('aria-checked', 'true')

  // The next dose without an answer (Lipitor 20:00) is reminded at once.
  await page.getByRole('button', { name: 'Show the next reminder now' }).click()
  await expect(banner(page)).toContainText(/20:00\s*Lipitor/)
  await expect(page.getByRole('status')).toHaveText('The reminder is on the screen.')
  await expect(banner(page).getByRole('button', { name: 'Remind me in 15 seconds' })).toBeVisible()

  // Demo speed: second reminder after 15 seconds.
  await page.clock.fastForward('00:16')
  await expect(banner(page)).toHaveAttribute('data-stage', 'followUp')
  await banner(page).getByRole('button', { name: 'I took it' }).click()
  await expect(banner(page)).toHaveCount(0)

  // Next: Nexium. Snooze 15 s, then it comes back; no answer for 60 s → Missed.
  await page.getByRole('button', { name: 'Show the next reminder now' }).click()
  await expect(banner(page)).toContainText(/22:00\s*Nexium/)
  await banner(page).getByRole('button', { name: 'Remind me in 15 seconds' }).click()
  await expect(banner(page)).toHaveCount(0)
  await page.clock.fastForward('00:16')
  await expect(banner(page)).toContainText(/22:00\s*Nexium/)
  await page.clock.fastForward('00:50')
  await expect(banner(page)).toHaveCount(0)

  await today(page)
  await expect(dose(page, '20:00 Lipitor')).toHaveAttribute('data-status', 'taken')
  await expect(dose(page, '22:00 Nexium')).toHaveAttribute('data-status', 'missed')

  // Nothing left to remind.
  await goToSettings(page)
  await page.getByRole('button', { name: 'Show the next reminder now' }).click()
  await expect(page.getByRole('status')).toHaveText('No more doses to remind today.')
})

test('7. Settings shows the account, Log out and the disclaimer', async ({ page }) => {
  const user = await loginWithMeds(page, [], FAKE_NOW)
  await goToSettings(page)
  await expect(page.getByText(`Logged in as ${user.session.user.email}`)).toBeVisible()
  await expect(page.getByText('Med Friend only records what you enter. It does not give medical advice.')).toBeVisible()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
})

test('8. Reminder and Settings work in Arabic; text ≥ 18px and buttons ≥ 48px', async ({ page }) => {
  async function checkSizes() {
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
  }

  await start(page, [
    { name: 'أسبوسيد', times: ['13:00'] },
    { name: 'كونكور', times: ['13:00'] },
  ])
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await page.clock.fastForward('00:15')
  await expect(banner(page)).toContainText('حان موعد دواء الظهر')
  await expect(banner(page)).toContainText('1 من 2')
  await expect(banner(page).getByRole('button', { name: 'ذكّرني بعد 15 دقيقة' })).toBeVisible()
  await checkSizes()

  // The panel covers the screen until both doses are answered.
  await banner(page).getByRole('button', { name: 'أخذتها' }).click()
  await expect(banner(page)).not.toContainText('1 من 2')
  await banner(page).getByRole('button', { name: 'أخذتها' }).click()
  await expect(banner(page)).toHaveCount(0)
  await page.getByRole('navigation').getByRole('button', { name: 'الإعدادات' }).click()
  await expect(page.getByRole('heading', { name: 'الإعدادات' })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'السرعة التجريبية' })).toBeVisible()
  await checkSizes()
})
