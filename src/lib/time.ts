// Dates and times in Asia/Amman, whatever time zone the phone or laptop is set to.

export const TIME_ZONE = 'Asia/Amman'

/** Minutes after its time during which an unanswered dose is "Due now"; after that it is "Missed". */
export const MISSED_AFTER_MIN = 60

const partsFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function ammanParts(instant: Date) {
  const p = Object.fromEntries(partsFormat.formatToParts(instant).map((x) => [x.type, x.value]))
  return {
    date: `${p.year}-${p.month}-${p.day}`, // "2026-11-20"
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  }
}

/** Today's date in Amman, "YYYY-MM-DD". */
export function ammanDate(instant: Date): string {
  return ammanParts(instant).date
}

/** "HH:MM" in Amman. */
export function ammanTime(instant: Date): string {
  const p = ammanParts(instant)
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

/** The exact moment of a clock time ("08:00") on a date ("2026-11-20") in Amman. */
export function ammanInstant(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  const wanted = Date.UTC(y, m - 1, d, h, min)
  // Start from "as if UTC", then correct by Amman's offset at that moment (twice, for DST edges).
  let guess = wanted
  for (let i = 0; i < 2; i++) {
    const p = ammanParts(new Date(guess))
    const [py, pm, pd] = p.date.split('-').map(Number)
    const shown = Date.UTC(py, pm - 1, pd, p.hour, p.minute, p.second)
    guess += wanted - shown
  }
  return new Date(guess)
}

/** The next calendar date, "YYYY-MM-DD". */
export function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

export type DayPart = 'morning' | 'noon' | 'evening' | 'night'
export const DAY_PARTS: DayPart[] = ['morning', 'noon', 'evening', 'night']

/** Morning 04:00–11:59, Noon 12:00–16:59, Evening 17:00–20:59, Night 21:00–03:59. */
export function dayPart(time: string): DayPart {
  const [h] = time.split(':').map(Number)
  if (h >= 4 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'noon'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

/** "Friday 20 November" / "الجمعة 20 تشرين الثاني" (Western digits in both languages). */
export function longDate(instant: Date, lang: 'ar' | 'en'): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(instant)
}

/** A date n days later (negative n: earlier), "YYYY-MM-DD". */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** "Thursday 19 November" for a "YYYY-MM-DD" date (Western digits in both languages). */
export function longDateOf(date: string, lang: 'ar' | 'en'): string {
  return longDate(ammanInstant(date, '12:00'), lang)
}
