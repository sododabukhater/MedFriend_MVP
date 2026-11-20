import type { DoseLog } from '../storage/doseLogs'
import { doseKey } from '../storage/doseLogs'
import type { Medication } from '../storage/medications'
import { ammanInstant, dayPart, MISSED_AFTER_MIN, type DayPart } from './time'

// One scheduled dose and its status. Shared by F2 Today (and later F1 reminders, F8 adherence).

/** open = not answered, but scheduled before the medicine was added (never counted as missed). */
export type ShownStatus = 'upcoming' | 'due' | 'missed' | 'open' | 'taken' | 'skipped'

export type Dose = {
  med: Medication
  time: string // "08:00"
  scheduledAt: Date
  part: DayPart
  log: DoseLog | null
  status: ShownStatus
}

export function statusOf(scheduledAt: Date, log: DoseLog | null, now: Date, medCreatedAt: Date): ShownStatus {
  if (log?.status === 'taken') return 'taken'
  if (log?.status === 'skipped') return 'skipped'
  const minutesLate = (now.getTime() - scheduledAt.getTime()) / 60_000
  if (minutesLate < 0) return 'upcoming'
  if (minutesLate < MISSED_AFTER_MIN) return 'due'
  if (scheduledAt < medCreatedAt) return 'open'
  return 'missed'
}

/** Every dose of every medicine on one Amman date, in time order. */
export function dosesForDate(meds: Medication[], logs: DoseLog[], date: string, now: Date): Dose[] {
  const byKey = new Map(logs.map((l) => [doseKey(l.medicationId, l.scheduledAt), l]))
  const doses: Dose[] = []
  for (const med of meds) {
    for (const time of med.times) {
      const scheduledAt = ammanInstant(date, time)
      const log = byKey.get(doseKey(med.id, scheduledAt)) ?? null
      doses.push({
        med,
        time,
        scheduledAt,
        part: dayPart(time),
        log,
        status: statusOf(scheduledAt, log, now, new Date(med.createdAt)),
      })
    }
  }
  return doses.sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name))
}
