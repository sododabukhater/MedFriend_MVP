import type { MessageKey } from '../i18n'
import type { DoseLog } from '../storage/doseLogs'
import type { Medication } from '../storage/medications'

// F7: stock count + low-stock refill alert. Spec: docs/specs/F7.md
// Nothing is subtracted in the database: left = count saved at stockSetAt − amount × doses taken after that moment.

/** Warn when this many days (or fewer) are left. */
export const LOW_DAYS = 7
export const MAX_PACK = 9999
export const MAX_COUNT = 99999
/** "How many more full boxes?" goes up to this. */
export const MAX_EXTRA_BOXES = 20

export type StockLevel = 'ok' | 'low' | 'out'
export type StockInfo = { left: number; days: number; level: StockLevel }

/** Taken doses that count against this medicine's stock (recorded after the count was saved). */
export function countsAgainst(med: Medication, log: Pick<DoseLog, 'medicationId' | 'status' | 'recordedAt'>): boolean {
  return (
    med.stockSetAt !== null &&
    log.medicationId === med.id &&
    log.status === 'taken' &&
    log.recordedAt.getTime() >= med.stockSetAt.getTime()
  )
}

/** What is left, how many days it lasts, and the level. Null when the medicine has no stock count. */
export function stockInfo(med: Medication, takenDoses: number): StockInfo | null {
  if (med.stockCount === null || med.packSize === null) return null
  const left = Math.max(0, Math.round((med.stockCount - takenDoses * med.amount) * 100) / 100)
  const perDay = med.amount * med.timesPerDay
  const days = perDay > 0 ? Math.floor(left / perDay) : Number.POSITIVE_INFINITY
  const level: StockLevel = left <= 0 ? 'out' : days <= LOW_DAYS ? 'low' : 'ok'
  return { left, days, level }
}

type T = (key: MessageKey, vars?: Record<string, string | number>) => string

/** "about 45 days" / «يكفي نحو 45 يومًا» (Arabic needs the right noun form for the number). */
export function daysText(t: T, days: number): string {
  if (days < 1) return t('stock.days.0')
  if (days === 1) return t('stock.days.1')
  if (days === 2) return t('stock.days.2')
  if (days <= 10) return t('stock.days.few', { n: days })
  return t('stock.days.many', { n: days })
}

export type StockCheck =
  | { ok: true; empty: true }
  | { ok: true; empty: false; pack: number; left: number }
  | { ok: false; problem: MessageKey | null }

/**
 * Checks the box questions. Both empty = nothing set (Add medication: Skip for now). `left` in the result is the total.
 * `extraBoxes` = null: Correct the count (the second number is the total; it can be more than one box).
 * `extraBoxes` = a number: setting up a box. The second number is what is left in the box in use (not more than one
 * box); the total adds the full boxes.
 */
export function checkStock(packText: string, leftText: string, extraBoxes: number | null): StockCheck {
  if (packText === '' && leftText === '') return { ok: true, empty: true }
  const pack = parseCount(packText, MAX_PACK)
  if (pack === null || pack === 0) return { ok: false, problem: packText === '' ? null : 'stock.needPack' }
  const left = parseCount(leftText, MAX_COUNT)
  if (left === null) return { ok: false, problem: leftText === '' ? null : 'stock.needLeft' }
  if (extraBoxes === null) return { ok: true, empty: false, pack, left }
  if (left > pack) return { ok: false, problem: 'stock.tooMany' }
  const total = Math.round((extraBoxes * pack + left) * 100) / 100
  if (total > MAX_COUNT) return { ok: false, problem: 'stock.needLeft' }
  return { ok: true, empty: false, pack, left: total }
}

/** Reads what the patient types in a count box: Arabic digits accepted, up to 2 decimals. Null = empty / invalid. */
export function parseCount(text: string, max: number): number | null {
  if (text === '') return null
  const n = Number(text)
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null
}
