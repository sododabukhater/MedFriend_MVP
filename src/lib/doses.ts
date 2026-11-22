import type { DoseLog } from '../storage/doseLogs'
import { doseKey } from '../storage/doseLogs'
import type { Medication } from '../storage/medications'
import { DEFAULT_PREFS, doseTimesOn, type Anchor, type Prefs } from './anchors'
import { ammanInstant, dayPart, MISSED_AFTER_MIN, type DayPart } from './time'

// One scheduled dose and its status. Shared by F2 Today, F1 reminders (and later F8 adherence).

/** Minutes until a reminder with no answer is repeated, and the length of a Snooze. */
export const FOLLOW_UP_MIN = 15
export const SNOOZE_MIN = 15

/** open = not answered, but scheduled before the medicine was added (never counted as missed). */
export type ShownStatus = 'upcoming' | 'due' | 'snoozed' | 'missed' | 'open' | 'taken' | 'skipped'

export type Dose = {
  key: string
  med: Medication
  time: string // "08:00" (that day's time for an anchored dose)
  /** F3: '' or e.g. "fajr", "breakfast:before". */
  anchor: Anchor
  scheduledAt: Date
  /** When the reminder starts: the scheduled time, or "now" if triggered from Settings. */
  dueAt: Date
  part: DayPart
  log: DoseLog | null
  status: ShownStatus
  /** Snoozed until this moment (status "snoozed"). */
  snoozedUntil: Date | null
}

/**
 * @param minute length of one minute in ms (1000 with Demo speed)
 */
export function statusOf(
  dueAt: Date,
  log: DoseLog | null,
  now: Date,
  medCreatedAt: Date,
  minute: number,
): ShownStatus {
  if (log?.status === 'taken') return 'taken'
  if (log?.status === 'skipped') return 'skipped'
  const late = (now.getTime() - dueAt.getTime()) / minute
  if (late < 0) return 'upcoming'
  if (late >= MISSED_AFTER_MIN) return dueAt < medCreatedAt ? 'open' : 'missed'
  if (log?.status === 'snoozed' && now < snoozeEnd(log, minute)) return 'snoozed'
  return 'due'
}

export function snoozeEnd(log: DoseLog, minute: number): Date {
  return new Date(log.recordedAt.getTime() + SNOOZE_MIN * minute)
}

/**
 * Every dose of every medicine on one Amman date, in time order.
 * @param triggered doses shown as due right now from "Trigger next reminder now" (key → moment)
 */
export function dosesForDate(
  meds: Medication[],
  logs: DoseLog[],
  date: string,
  now: Date,
  minute: number,
  triggered: Map<string, Date> = new Map(),
  prefs: Prefs = DEFAULT_PREFS,
): Dose[] {
  const byKey = new Map(logs.map((l) => [doseKey(l.medicationId, l.scheduledAt), l]))
  const doses: Dose[] = []
  for (const med of meds) {
    for (const { time, anchor } of doseTimesOn(med, date, prefs)) {
      const scheduledAt = ammanInstant(date, time)
      const key = doseKey(med.id, scheduledAt)
      const log = byKey.get(key) ?? null
      const dueAt = triggered.get(key) ?? scheduledAt
      const status = statusOf(dueAt, log, now, new Date(med.createdAt), minute)
      doses.push({
        key,
        med,
        time,
        anchor,
        scheduledAt,
        dueAt,
        part: dayPart(time),
        log,
        status,
        snoozedUntil: status === 'snoozed' && log ? snoozeEnd(log, minute) : null,
      })
    }
  }
  return doses.sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name))
}

export type Reminder = {
  dose: Dose
  /** first = the reminder; followUp = repeated after 15 min without an answer */
  stage: 'first' | 'followUp'
  /** Identifies this alert, so the chime plays once per reminder / follow-up. */
  alertId: string
}

/** Doses that need a reminder banner now: due and not answered (a finished snooze counts again). */
export function activeReminders(doses: Dose[], now: Date, minute: number): Reminder[] {
  const out: Reminder[] = []
  for (const dose of doses) {
    if (dose.status !== 'due') continue
    // After a snooze, the reminder starts again from the end of the snooze.
    const start = dose.log?.status === 'snoozed' ? snoozeEnd(dose.log, minute) : dose.dueAt
    const stage = now.getTime() - start.getTime() >= FOLLOW_UP_MIN * minute ? 'followUp' : 'first'
    out.push({ dose, stage, alertId: `${dose.key}:${start.getTime()}:${stage}` })
  }
  return out
}
