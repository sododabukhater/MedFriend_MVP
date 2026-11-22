import { useCallback, useEffect, useMemo, useState } from 'react'
import { doseKey, listDoseLogs, markDose, undoDose, type DoseLog } from '../storage/doseLogs'
import type { Medication } from '../storage/medications'
import type { Prefs } from './anchors'
import { activeReminders, dosesForDate, type Dose } from './doses'
import { minuteMs, useDemoSpeed } from './settings'
import { ammanDate, ammanInstant, nextDate } from './time'

export type DoseAction = 'taken' | 'skipped' | 'snoozed' | 'undo'

/** The current time; ticks every second so reminders and statuses change without a reload. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

/** Today's doses, their answers and reminders. Used by Today (F2) and the reminder banner (F1). */
export function useDoses(meds: Medication[] | null, userId: string | null, prefs: Prefs) {
  const demo = useDemoSpeed()
  const minute = minuteMs(demo)
  const now = useNow()
  const date = ammanDate(now)
  const [logs, setLogs] = useState<DoseLog[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  // "Trigger next reminder now": dose key → the moment it was triggered.
  const [triggered, setTriggered] = useState<Map<string, Date>>(new Map())

  const load = useCallback(() => {
    setLoadError(false)
    setLogs(null)
    setTriggered(new Map())
    if (!userId) return
    listDoseLogs(ammanInstant(date, '00:00'), ammanInstant(nextDate(date), '00:00')).then(setLogs, (err: unknown) => {
      console.error('Loading dose log failed', err)
      setLoadError(true)
    })
  }, [date, userId])

  // Load today's answers after login (and again after midnight, when the date changes).
  useEffect(load, [load])

  const doses: Dose[] = useMemo(
    () => (meds && logs ? dosesForDate(meds, logs, date, now, minute, triggered, prefs) : []),
    [meds, logs, date, now, minute, triggered, prefs],
  )
  const reminders = useMemo(() => activeReminders(doses, now, minute), [doses, now, minute])

  async function answer(dose: Dose, action: DoseAction) {
    setBusyKey(dose.key)
    setSaveError(false)
    try {
      const others = (logs ?? []).filter((l) => doseKey(l.medicationId, l.scheduledAt) !== dose.key)
      if (action === 'undo') {
        await undoDose(dose.med.id, dose.scheduledAt)
        setLogs(others)
      } else {
        const saved = await markDose(dose.med.id, dose.scheduledAt, action)
        setLogs([...others, saved])
      }
      if (action !== 'snoozed' && triggered.has(dose.key)) {
        const next = new Map(triggered)
        next.delete(dose.key)
        setTriggered(next)
      }
    } catch (err) {
      console.error('Saving dose failed', err)
      setSaveError(true)
    } finally {
      setBusyKey(null)
    }
  }

  /** Shows the reminder at once for the next dose today that has no answer. Returns false if none. */
  function triggerNext(): boolean {
    const next = doses.find((d) => d.status === 'upcoming' && !triggered.has(d.key))
    if (!next) return false
    setTriggered(new Map(triggered).set(next.key, new Date()))
    return true
  }

  return { now, date, logs, doses, reminders, ready: logs !== null, loadError, saveError, busyKey, answer, reload: load, triggerNext }
}

export type DosesApi = ReturnType<typeof useDoses>
