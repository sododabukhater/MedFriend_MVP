import { useSyncExternalStore } from 'react'
import type { MessageKey } from '../i18n'
import { anchorLabel } from './anchors'
import type { StrengthUnit } from '../storage/medications'
import type { Dose } from './doses'
import { amountText } from './format'
import { sayAmountAr, sayStrengthAr, spokenName } from './spokenArabic'

// F5: the dose read aloud with the browser's own voice (speechSynthesis). Spec: docs/specs/F5.md
// No recording, no online service. Browsers allow automatic speech only after the first tap on the page.

type T = (key: MessageKey, vars?: Record<string, string | number>) => string

const synth = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null

// Some browsers load their voice list a moment after the page; asking once starts the loading.
synth()?.getVoices()

/**
 * The best voice for a language ('ar' / 'en'): a local one first. Undefined when the device lists voices but none fits.
 * `like` = the voice of the rest of the sentence: a second-language voice of the same kind (Edge's online "Natural"
 * voices vs. the built-in ones) is chosen first, because Edge does not switch reliably between the two kinds.
 */
function voiceFor(lang: string, like?: SpeechSynthesisVoice | null): SpeechSynthesisVoice | null | undefined {
  const voices = synth()?.getVoices() ?? []
  if (voices.length === 0) return null // list not loaded yet: let the browser choose by language
  const fitting = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(lang))
  if (like) {
    const sameKind = fitting.filter((v) => v.localService === like.localService)
    const natural = sameKind.find((v) => /natural/i.test(v.name))
    if (natural || sameKind[0]) return natural ?? sameKind[0]
  }
  return fitting.find((v) => v.localService) ?? fitting[0]
}

/** One piece of a readout and the voice language it needs: an Arabic sentence can carry an English name. */
export type SpeechPart = { text: string; lang: 'ar' | 'en' }

const DEFAULT_LANG_TAG = { ar: 'ar-SA', en: 'en-US' } as const

/**
 * Speaks the parts one after another, each with a voice for its own language (an English name inside an Arabic
 * sentence is said by the English voice). Returns false when this device has no voice for the app language.
 */
export function speak(parts: SpeechPart[], appLang: string): boolean {
  const s = synth()
  if (!s) return false
  const main = voiceFor(appLang)
  if (main === undefined) return false
  s.cancel() // a new readout replaces the previous one
  const run = ++readout
  const utterances = parts.map((part) => {
    const own = part.lang === appLang ? main : voiceFor(part.lang, main)
    // No voice for this part's language: the app-language voice says it as well as it can.
    const voice = own === undefined ? main : own
    const u = new SpeechSynthesisUtterance(part.text)
    u.lang = voice?.lang ?? (own === undefined ? DEFAULT_LANG_TAG[appLang as 'ar' | 'en'] : DEFAULT_LANG_TAG[part.lang])
    if (voice) u.voice = voice
    u.rate = 0.9 // a little slower than normal, easier to follow
    return u
  })
  // One part at a time: the next starts when the previous has ended (Edge mixes up voices in a queue).
  const next = (i: number) => {
    if (run !== readout || i >= utterances.length) return
    const u = utterances[i]
    let done = false
    const go = () => {
      if (done) return
      done = true
      clearTimeout(guard)
      next(i + 1)
    }
    // Safety net if the browser never reports the end of a part.
    const guard = setTimeout(go, 4000 + u.text.length * 150)
    u.onend = go
    u.onerror = go
    s.speak(u)
  }
  next(0)
  return true
}

let readout = 0 // a newer readout (or Stop) ends the chain of an older one

export function stopSpeaking(): void {
  readout++
  synth()?.cancel()
}

const ARABIC_LETTERS = /[؀-ۿ]/
const NAME_SLOT = '\u0001'

/** What is read for a dose: name and strength, amount, and the moment of the day for anchored doses. */
export function doseSpeech(t: T, lang: string, dose: Dose, followUp = false): SpeechPart[] {
  const { med } = dose
  // Names from the suggestion list are said by their English box name ("Concor"), even when saved in Arabic letters.
  const name = spokenName(med.name)
  const hasStrength = med.strengthValue !== null && med.strengthUnit !== null
  const englishName = !ARABIC_LETTERS.test(name)
  const nameEn = hasStrength ? `${name} ${sayStrengthEn(med.strengthValue!, med.strengthUnit!)}` : name
  const prefix = followUp ? `${t('speak.followUp')} ` : ''

  if (lang !== 'ar') {
    const text = t('speak.dose', {
      name: nameEn,
      amount: amountText(t, med.form, med.amount),
      moment: dose.anchor ? t('speak.moment', { moment: anchorLabel(t, dose.anchor) }) : '',
    })
    return [{ text: prefix + text, lang: 'en' }]
  }

  // Arabic: said the way people say it ("حبّةٌ واحدةٌ"), not as printed ("1 حبة").
  const rest = {
    amount: sayAmountAr(med.form, med.amount),
    moment: dose.anchor ? t('speak.moment', { moment: anchorLabel(t, dose.anchor) }) : '',
  }
  if (!englishName) {
    // A name typed in Arabic stays in the Arabic sentence.
    const nameAr = hasStrength ? `${name} ${sayStrengthAr(med.strengthValue!, med.strengthUnit!)}` : name
    return [{ text: prefix + t('speak.dose', { name: nameAr, ...rest }), lang: 'ar' }]
  }
  // An English name (and its strength) is said by the English voice, between the Arabic parts.
  const [before, after = ''] = t('speak.dose', { name: NAME_SLOT, ...rest }).split(NAME_SLOT)
  const parts: SpeechPart[] = [
    { text: (prefix + before).trim(), lang: 'ar' },
    { text: nameEn, lang: 'en' },
    { text: after.replace(/^[\s،,]+/, '').trim(), lang: 'ar' },
  ]
  return parts.filter((p) => p.text !== '')
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
