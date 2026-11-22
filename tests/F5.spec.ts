import { expect, test, type Page } from '@playwright/test'
import { sayAmountAr, sayStrengthAr } from '../src/lib/spokenArabic'
import { goToSettings, loginWithMeds, type MedRow } from './helpers'

// Acceptance criteria: docs/specs/F5.md (voice dose readout).
// Fake clock: 12:59:50 in Amman, 10 seconds before a 13:00 dose. The browser voice is replaced by a recorder.
const FAKE_NOW = new Date('2026-11-18T09:59:50Z')

type Spoken = { text: string; lang: string; voice: string | null }

async function start(page: Page, meds: MedRow[], opts: { voices?: string[] } = {}) {
  await page.addInitScript(
    ({ voices }) => {
      const w = window as unknown as { spoken: unknown[]; cancels: number }
      w.spoken = []
      w.cancels = 0
      const list = voices.map((l) => ({ lang: l, name: `Voice ${l}`, localService: true, default: false, voiceURI: l }))
      const fake = {
        getVoices: () => list,
        speak: (u: { text: string; lang: string; voice: { lang: string } | null }) =>
          w.spoken.push({ text: u.text, lang: u.lang, voice: u.voice ? u.voice.lang : null }),
        cancel: () => {
          w.cancels++
        },
        addEventListener() {},
        removeEventListener() {},
        speaking: false,
        pending: false,
        paused: false,
      }
      Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true })
      ;(window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
        text: string
        lang = ''
        voice: unknown = null
        rate = 1
        constructor(text: string) {
          this.text = text
        }
      }
    },
    { voices: opts.voices ?? ['en-US', 'ar-SA'] },
  )
  await loginWithMeds(page, meds, FAKE_NOW)
}

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { spoken: Spoken[] }).spoken)
const cancels = (page: Page) => page.evaluate(() => (window as unknown as { cancels: number }).cancels)
const banner = (page: Page) => page.getByRole('alertdialog')
const ASPOCID: MedRow = { name: 'Aspocid', times: ['13:00'], strength: [81, 'mg'] }

test('1. The reminder is read aloud by itself, once, in English with an English voice', async ({ page }) => {
  await start(page, [ASPOCID])
  await page.clock.fastForward('00:15')
  await expect(banner(page)).toBeVisible()
  await expect.poll(() => spoken(page)).toEqual([
    { text: 'Time for your medicine: Aspocid 81 milligrams, 1 tablet.', lang: 'en-US', voice: 'en-US' },
  ])
  // Still only once a few seconds later.
  await page.clock.fastForward('00:05')
  await page.waitForTimeout(300)
  expect(await spoken(page)).toHaveLength(1)
})

test('2. In Arabic the readout is Arabic, with an Arabic voice and the moment of the day', async ({ page }) => {
  // "With lunch" = the lunch time (default 14:00).
  await start(page, [{ name: 'كونكور', times: ['14:00'], strength: [5, 'mg'], anchors: ['lunch:with'] }])
  await page.getByRole('button', { name: 'تغيير اللغة إلى العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.clock.fastForward('01:00:15')
  await expect(banner(page)).toBeVisible()
  await expect.poll(async () => (await spoken(page))[0]).toEqual({
    text: 'حان وقت دوائك: كونكور 5 milligram، حبة واحدة، مع الغداء.',
    lang: 'ar-SA',
    voice: 'ar-SA',
  })
  const button = banner(page).getByRole('button', { name: 'اقرأ بصوت عالٍ: كونكور' })
  await expect(button).toHaveText('اقرأ بصوت عالٍ')
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48)
})

test('3. 🔊 in the reminder reads it again; 🔊 on the Today top card reads that dose', async ({ page }) => {
  await start(page, [ASPOCID, { name: 'Concor', times: ['20:00'] }])
  await page.clock.fastForward('00:15')
  await expect.poll(async () => (await spoken(page)).length).toBe(1)
  await banner(page).getByRole('button', { name: 'Read aloud: Aspocid' }).click()
  expect((await spoken(page)).map((s) => s.text)).toEqual([
    'Time for your medicine: Aspocid 81 milligrams, 1 tablet.',
    'Time for your medicine: Aspocid 81 milligrams, 1 tablet.',
  ])

  await banner(page).getByRole('button', { name: 'I took it' }).click()
  await expect(banner(page)).toHaveCount(0)
  // The top card now shows the next dose (Concor at 20:00).
  await page.getByTestId('hero').getByRole('button', { name: 'Read aloud: Concor' }).click()
  expect((await spoken(page)).at(-1)!.text).toBe('Time for your medicine: Concor, 1 tablet.')
})

test('4. The follow-up reminder is read with the follow-up words', async ({ page }) => {
  await start(page, [ASPOCID])
  await page.clock.fastForward('00:15')
  await expect.poll(async () => (await spoken(page)).length).toBe(1)
  await page.clock.fastForward('15:00')
  await expect(banner(page)).toHaveAttribute('data-stage', 'followUp')
  await expect
    .poll(async () => (await spoken(page)).at(-1)!.text)
    .toBe('Reminder: this dose is not recorded yet. Time for your medicine: Aspocid 81 milligrams, 1 tablet.')
})

test('5. "Read reminders aloud" off: no automatic voice, 🔊 still works, the choice stays after reload', async ({ page }) => {
  await start(page, [ASPOCID])
  await goToSettings(page)
  const sw = page.getByRole('switch', { name: 'Read reminders aloud' })
  await expect(sw).toHaveAttribute('aria-checked', 'true') // on by default
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await page.reload()
  await goToSettings(page)
  await expect(page.getByRole('switch', { name: 'Read reminders aloud' })).toHaveAttribute('aria-checked', 'false')

  await page.clock.fastForward('00:15')
  await expect(banner(page)).toBeVisible()
  await page.clock.fastForward('00:03')
  await page.waitForTimeout(300)
  expect(await spoken(page)).toHaveLength(0)
  await banner(page).getByRole('button', { name: 'Read aloud: Aspocid' }).click()
  expect(await spoken(page)).toHaveLength(1)
})

test('6. No voice for the language: 🔊 says "Voice not available on this device."', async ({ page }) => {
  await start(page, [ASPOCID], { voices: ['fr-FR'] })
  await page.clock.fastForward('00:15')
  await expect(banner(page)).toBeVisible()
  await banner(page).getByRole('button', { name: 'Read aloud: Aspocid' }).click()
  await expect(banner(page).getByRole('status')).toHaveText('Voice not available on this device.')
  expect(await spoken(page)).toHaveLength(0)
  // The reminder still works.
  await banner(page).getByRole('button', { name: 'I took it' }).click()
  await expect(banner(page)).toHaveCount(0)
})

test('7. Answering the reminder stops the voice', async ({ page }) => {
  await start(page, [ASPOCID])
  await page.clock.fastForward('00:15')
  await expect.poll(async () => (await spoken(page)).length).toBe(1)
  const before = await cancels(page)
  await banner(page).getByRole('button', { name: 'Skip this dose' }).click()
  expect(await cancels(page)).toBeGreaterThan(before)
})

test('8. Arabic amounts and units are said the way people say them', () => {
  const cases: [Parameters<typeof sayAmountAr>[0], number, string][] = [
    ['tablet', 1, 'حبة واحدة'],
    ['tablet', 2, 'حبتان'],
    ['tablet', 0.5, 'نصف حبة'],
    ['tablet', 1.5, 'حبة ونصف'],
    ['tablet', 2.5, 'حبتان ونصف'],
    ['tablet', 3, 'ثلاث حبات'],
    ['capsule', 10, 'عشر كبسولات'],
    ['drops', 4, 'أربع نقاط'],
    ['syrup', 5, 'خمسة ملّيلترات'],
    ['syrup', 1, 'ملّيلتر واحد'],
    ['syrup', 12.5, '12.5 ملّيلتر'],
    ['injection', 12, '12 وحدة'],
  ]
  for (const [form, amount, said] of cases) expect(sayAmountAr(form, amount), String(amount) + ' ' + form).toBe(said)
  expect(sayStrengthAr(5, 'mg')).toBe('5 milligram')
  expect(sayStrengthAr(100, 'mcg')).toBe('100 microgram')
  expect(sayStrengthAr(2, 'percent')).toBe('2 بالمئة')
})
