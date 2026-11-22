import type { DoseLog } from '../storage/doseLogs'
import { doseKey } from '../storage/doseLogs'
import type { Medication } from '../storage/medications'
import { DEFAULT_PREFS, doseTimesOn, type Prefs } from './anchors'
import { statusOf } from './doses'
import { addDays, ammanDate, ammanInstant, MISSED_AFTER_MIN } from './time'

// F8: adherence % and the dose log. Spec: docs/specs/F8.md
// A dose counts once it is decided: Taken, Skipped, or Missed (no answer 60 min after its time).
// Adherence = Taken ÷ counted doses (Skipped counts as not taken). Doses before a medicine was added never count.

export const HISTORY_DAYS = 30
export const SHORT_DAYS = 7

export type LoggedDose = {
  med: Medication
  date: string // Amman "YYYY-MM-DD"
  time: string // "08:00"
  scheduledAt: Date
  status: 'taken' | 'skipped' | 'missed'
  recordedAt: Date | null
  onTime: boolean
}

export type Stats = {
  counted: number
  taken: number
  onTime: number
  /** Rounded %, or null when nothing counts yet. */
  pct: number | null
}

/** Every counted dose of the last `days` days (today included), newest first. */
export function countedDoses(
  meds: Medication[],
  logs: DoseLog[],
  now: Date,
  minute: number,
  days = HISTORY_DAYS,
  prefs: Prefs = DEFAULT_PREFS,
): LoggedDose[] {
  const byKey = new Map(logs.map((l) => [doseKey(l.medicationId, l.scheduledAt), l]))
  const today = ammanDate(now)
  const out: LoggedDose[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i)
    for (const med of meds) {
      const createdAt = new Date(med.createdAt)
      for (const { time } of doseTimesOn(med, date, prefs)) {
        const scheduledAt = ammanInstant(date, time)
        if (scheduledAt < createdAt) continue
        const log = byKey.get(doseKey(med.id, scheduledAt)) ?? null
        const status = statusOf(scheduledAt, log, now, createdAt, minute)
        if (status !== 'taken' && status !== 'skipped' && status !== 'missed') continue
        const recordedAt = status === 'missed' ? null : (log?.recordedAt ?? null)
        const onTime =
          status === 'taken' &&
          recordedAt !== null &&
          Math.abs(recordedAt.getTime() - scheduledAt.getTime()) <= MISSED_AFTER_MIN * minute
        out.push({ med, date, time, scheduledAt, status, recordedAt, onTime })
      }
    }
  }
  return out.sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime() || a.med.name.localeCompare(b.med.name))
}

export function stats(doses: LoggedDose[]): Stats {
  const taken = doses.filter((d) => d.status === 'taken').length
  return {
    counted: doses.length,
    taken,
    onTime: doses.filter((d) => d.onTime).length,
    pct: doses.length === 0 ? null : Math.round((taken / doses.length) * 100),
  }
}

/** Doses of the last `days` days (today included) out of a longer list. */
export function lastDays(doses: LoggedDose[], now: Date, days: number): LoggedDose[] {
  const first = addDays(ammanDate(now), -(days - 1))
  return doses.filter((d) => d.date >= first)
}
