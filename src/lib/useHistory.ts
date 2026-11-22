import { useCallback, useEffect, useMemo, useState } from 'react'
import { listDoseLogs, type DoseLog } from '../storage/doseLogs'
import type { Medication } from '../storage/medications'
import { countedDoses, HISTORY_DAYS, type LoggedDose } from './adherence'
import { usePrefs } from './prefs'
import { minuteMs, useDemoSpeed } from './settings'
import { addDays, ammanDate, ammanInstant, nextDate } from './time'

/**
 * The last 30 days of counted doses (F8), loaded each time a screen opens.
 * Used by Progress and the doctor summary (F9).
 */
export function useHistory(meds: Medication[]) {
  const minute = minuteMs(useDemoSpeed())
  const prefs = usePrefs()
  const [now] = useState(() => new Date())
  const [logs, setLogs] = useState<DoseLog[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(() => {
    setLoadError(false)
    const today = ammanDate(now)
    listDoseLogs(ammanInstant(addDays(today, -(HISTORY_DAYS - 1)), '00:00'), ammanInstant(nextDate(today), '00:00')).then(
      setLogs,
      (err: unknown) => {
        console.error('Loading history failed', err)
        setLoadError(true)
      },
    )
  }, [now])

  useEffect(load, [load])

  const all: LoggedDose[] = useMemo(
    () => (logs ? countedDoses(meds, logs, now, minute, HISTORY_DAYS, prefs) : []),
    [meds, logs, now, minute, prefs],
  )
  return { now, ready: logs !== null, loadError, reload: load, all }
}
