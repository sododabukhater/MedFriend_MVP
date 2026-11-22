import { useSyncExternalStore } from 'react'
import type { MessageKey } from '../i18n'
import { anchorLabel } from './anchors'
import type { StrengthUnit } from '../storage/medications'
import type { Dose } from './doses'
import { amountText } from './format'
import { sayAmountAr, sayStrengthAr } from './spokenArabic'

// F5: the dose read aloud with the browser's own voice (speechSynthesis). Spec: docs/specs/F5.md
// No recording, no online service. Browsers allow automatic speech only after the first tap on the page.

type T = (key: MessageKey, vars?: Record<string, string | number>) => string

const synth = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null

// Some browsers load their voice list a moment after the page; asking once starts the loading.
synth()?.getVoices()

/** The best voice for a language ('ar' / 'en'): a local one first. Undefined when the device lists voices but none fits. */
function voiceFor(lang: string): SpeechSynthesisVoice | null | undefined {
  const voices = synth()?.getVoices() ?? []
  if (voices.length === 0) return null // list not loaded yet: let the browser choose by language
  const fitting = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(lang))
  return fitting.find((v) => v.localService) ?? fitting[0]
}

/** Speaks the text in the app language. Returns false when this device has no voice for it. */
export function speak(text: string, lang: string): boolean {
  const s = synth()
  if (!s) return false
  const voice = voiceFor(lang)
  if (voice === undefined) return false
  s.cancel() // a new readout replaces the previous one
  const u = new SpeechSynthesisUtterance(text)
  u.lang = voice?.lang ?? (lang === 'ar' ? 'ar-SA' : 'en-US')
  if (voice) u.voice = voice
  u.rate = 0.9 // a little slower than normal, easier to follow
  s.speak(u)
  return true
}

export function stopSpeaking(): void {
  synth()?.cancel()
}

/** What is read for a dose: name and strength, amount, and the moment of the day for anchored doses. */
export function doseSpeech(t: T, lang: string, dose: Dose, followUp = false): string {
  const { med } = dose
  const ar = lang === 'ar'
  // Arabic: said the way people say it ("حبة واحدة", "5 milligram"), not as printed ("1 حبة", "5 ملغ").
  const strength =
    med.strengthValue === null || med.strengthUnit === null
      ? ''
      : ar
        ? sayStrengthAr(med.strengthValue, med.strengthUnit)
        : sayStrengthEn(med.strengthValue, med.strengthUnit)
  const text = t('speak.dose', {
    name: strength ? `${med.name} ${strength}` : med.name,
    amount: ar ? sayAmountAr(med.form, med.amount) : amountText(t, med.form, med.amount),
    moment: dose.anchor ? t('speak.moment', { moment: anchorLabel(t, dose.anchor) }) : '',
  })
  return followUp ? `${t('speak.followUp')} ${text}` : text
}

const UNITS_EN: Record<StrengthUnit, string> = {
  mg: 'milligrams',
  mcg: 'micrograms',
  g: 'grams',
  ml: 'millilitres',
  unit: 'units',
  percent: 'percent',
}

/** "5 milligrams" (English voices may read "mg" letter by letter). */
function sayStrengthEn(value: number, unit: StrengthUnit): string {
  return `${value} ${UNITS_EN[unit]}`
}

// "Read reminders aloud" (per device, on by default). Same pattern as Demo speed in settings.ts.
const READ_KEY = 'medfriend.readAloud'
const listeners = new Set<() => void>()

function readSetting(): boolean {
  try {
    return localStorage.getItem(READ_KEY) !== 'off'
  } catch {
    return true
  }
}

let readAloud = readSetting()

export function setReadAloud(on: boolean): void {
  readAloud = on
  try {
    if (on) localStorage.removeItem(READ_KEY)
    else localStorage.setItem(READ_KEY, 'off')
  } catch {
    // Not saved; still applies for this visit.
  }
  listeners.forEach((fn) => fn())
}

export function getReadAloud(): boolean {
  return readAloud
}

export function useReadAloud(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => readAloud,
  )
}
