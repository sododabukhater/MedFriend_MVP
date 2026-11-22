import { DRUGS } from '../data/drugs'
import type { Form, StrengthUnit } from '../storage/medications'

// F5: how the voice should SAY a medicine name, an amount and a strength. The screen keeps its short form
// ("كونكور", "1 حبة", "5 ملغ"); read aloud, those came out wrong. These are grammar tables for speech, not screen text.
// Owner, 22 Nov: "حبة واحدة" not "واحد حبة"; mg / mcg / g and medicine names are said in English; and the voice
// guessed a wrong case ending ("حبةٍ واحدة"), so the amounts carry their full, correct case endings: the amount is
// a nominative phrase (الجرعة: حبّةٌ واحدةٌ), a counted noun after 3–10 is genitive plural, after 11+ accusative singular.
// REVIEW-AR: every word in this file.

/** Medicine names from the suggestion list are said by their English (box) name, even when saved in Arabic. */
export function spokenName(name: string): string {
  const trimmed = name.trim()
  return DRUGS.find((d) => d.ar === trimmed)?.brand ?? trimmed
}

type Noun = {
  one: string // nominative singular: حبّةٌ
  oneGen: string // genitive singular, after "نصفُ": حبّةٍ
  oneAcc: string // accusative singular, after 11+: حبّةً
  two: string // nominative dual: حبّتانِ
  many: string // genitive plural, after 3–10: حبّاتٍ
  feminine: boolean
}

const fem = (stem: string, dual: string, plural: string): Noun => ({
  one: `${stem}ٌ`,
  oneGen: `${stem}ٍ`,
  oneAcc: `${stem}ً`,
  two: dual,
  many: plural,
  feminine: true,
})

const NOUNS: Record<Form, Noun> = {
  tablet: fem('حبّة', 'حبّتانِ', 'حبّاتٍ'),
  capsule: fem('كبسولة', 'كبسولتانِ', 'كبسولاتٍ'),
  syrup: { one: 'ملّيلترٌ', oneGen: 'ملّيلترٍ', oneAcc: 'ملّيلتراً', two: 'ملّيلترانِ', many: 'ملّيلتراتٍ', feminine: false },
  injection: fem('وحدة', 'وحدتانِ', 'وحداتٍ'),
  inhaler: fem('بخّة', 'بخّتانِ', 'بخّاتٍ'),
  drops: fem('نقطة', 'نقطتانِ', 'نقاطٍ'),
  cream: fem('دهنة', 'دهنتانِ', 'دهناتٍ'),
  other: fem('جرعة', 'جرعتانِ', 'جرعاتٍ'),
}

// 3–10 before a noun, nominative: the number takes the opposite gender ("ثلاثُ حبّاتٍ", "خمسةُ ملّيلتراتٍ").
const WITH_FEMININE = ['', '', '', 'ثلاثُ', 'أربعُ', 'خمسُ', 'ستُّ', 'سبعُ', 'ثماني', 'تسعُ', 'عشرُ']
const WITH_MASCULINE = ['', '', '', 'ثلاثةُ', 'أربعةُ', 'خمسةُ', 'ستّةُ', 'سبعةُ', 'ثمانيةُ', 'تسعةُ', 'عشرةُ']

/** "حبّةٌ واحدةٌ", "حبّتانِ", "نصفُ حبّةٍ", "حبّةٌ ونصفٌ", "ثلاثُ حبّاتٍ", "12 حبّةً". */
export function sayAmountAr(form: Form, amount: number): string {
  const n = NOUNS[form]
  const whole = Math.floor(amount)
  const half = amount - whole === 0.5
  if (amount !== whole && !half) return `${amount} ${n.oneAcc}` // e.g. 7.25: digits are read as a number
  const and = half ? ' ونصفٌ' : ''
  if (whole === 0) return `نصفُ ${n.oneGen}`
  if (whole === 1) return half ? `${n.one} ونصفٌ` : `${n.one} ${n.feminine ? 'واحدةٌ' : 'واحدٌ'}`
  if (whole === 2) return `${n.two}${and}`
  if (whole <= 10) return `${(n.feminine ? WITH_FEMININE : WITH_MASCULINE)[whole]} ${n.many}${and}`
  return `${amount} ${n.oneAcc}` // 11 and up: accusative singular, "12 حبّةً"
}

const UNITS_AR: Record<StrengthUnit, string> = {
  mg: 'milligram',
  mcg: 'microgram',
  g: 'gram',
  ml: 'ملّيلتر',
  unit: 'وحدة',
  percent: 'بالمئة',
}

/** "5 milligram", "2.5 بالمئة". */
export function sayStrengthAr(value: number, unit: StrengthUnit): string {
  return `${value} ${UNITS_AR[unit]}`
}
