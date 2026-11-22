import type { Form, StrengthUnit } from '../storage/medications'

// F5: how the Arabic voice should SAY an amount and a strength. The screen keeps its short form ("1 حبة", "5 ملغ");
// read aloud, those come out as "واحد حبة" and "مليجرام". These are grammar tables for speech, not screen text.
// REVIEW-AR: every word in this file (owner, 22 Nov: "حبة واحدة" not "واحد حبة"; mg / mcg / g are said as the
// English words, because Arabic letters have no hard g and voices read "ملغ" as "مليجرام").

type Noun = { one: string; two: string; many: string; feminine: boolean }

const NOUNS: Record<Form, Noun> = {
  tablet: { one: 'حبة', two: 'حبتان', many: 'حبات', feminine: true },
  capsule: { one: 'كبسولة', two: 'كبسولتان', many: 'كبسولات', feminine: true },
  syrup: { one: 'ملّيلتر', two: 'ملّيلتران', many: 'ملّيلترات', feminine: false },
  injection: { one: 'وحدة', two: 'وحدتان', many: 'وحدات', feminine: true },
  inhaler: { one: 'بخّة', two: 'بخّتان', many: 'بخّات', feminine: true },
  drops: { one: 'نقطة', two: 'نقطتان', many: 'نقاط', feminine: true },
  cream: { one: 'دهنة', two: 'دهنتان', many: 'دهنات', feminine: true },
  other: { one: 'جرعة', two: 'جرعتان', many: 'جرعات', feminine: true },
}

// 3–10 before a noun: the number takes the opposite gender ("ثلاث حبات", "خمسة ملّيلترات").
const WITH_FEMININE = ['', '', '', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثماني', 'تسع', 'عشر']
const WITH_MASCULINE = ['', '', '', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة']

/** "حبة واحدة", "حبتان", "نصف حبة", "حبة ونصف", "ثلاث حبات", "12 حبة". */
export function sayAmountAr(form: Form, amount: number): string {
  const n = NOUNS[form]
  const whole = Math.floor(amount)
  const half = amount - whole === 0.5
  if (amount !== whole && !half) return `${amount} ${n.one}` // e.g. 7.25: digits are read as a number
  const and = half ? ' ونصف' : ''
  if (whole === 0) return `نصف ${n.one}`
  if (whole === 1) return half ? `${n.one} ونصف` : `${n.one} ${n.feminine ? 'واحدة' : 'واحد'}`
  if (whole === 2) return `${n.two}${and}`
  if (whole <= 10) return `${(n.feminine ? WITH_FEMININE : WITH_MASCULINE)[whole]} ${n.many}${and}`
  return `${amount} ${n.one}` // 11 and up take the singular: "12 حبة"
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
