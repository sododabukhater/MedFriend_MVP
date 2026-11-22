import { useEffect, useMemo, useState } from 'react'
import { listTakenBefore, type DoseLog } from '../storage/doseLogs'
import type { Medication } from '../storage/medications'
import { countsAgainst, stockInfo, type StockInfo } from './stock'
import { ammanInstant } from './time'

/**
 * F7: what is left of each medicine (medicine id → info; medicines without a box are not in the map).
 * Doses scheduled before today come from the database once; today's answers come live from useDoses,
 * so "I took it" and Undo change the count at once.
 */
export function useStock(meds: Medication[] | null, todayLogs: DoseLog[] | null, date: string): Map<string, StockInfo> {
  const [older, setOlder] = useState<DoseLog[]>([])
  const counted = (meds ?? []).filter((m) => m.stockSetAt !== null)
  // Reload when a count is saved (new moment) or the day changes.
  const key = `${date}|${counted.map((m) => `${m.id}:${m.stockSetAt!.getTime()}`).join(',')}`

  useEffect(() => {
    const since = counted.reduce<Date | null>((min, m) => (!min || m.stockSetAt! < min ? m.stockSetAt! : min), null)
    if (!since) return setOlder([])
    let current = true
    listTakenBefore(since, ammanInstant(date, '00:00')).then(
      (logs) => current && setOlder(logs),
      (err: unknown) => console.error('Loading stock failed', err),
    )
    return () => {
      current = false
    }
  }, [key])

  return useMemo(() => {
    const all = [...older, ...(todayLogs ?? [])]
    const map = new Map<string, StockInfo>()
    for (const med of counted) {
      const info = stockInfo(med, all.filter((l) => countsAgainst(med, l)).length)
      if (info) map.set(med.id, info)
    }
    return map
  }, [key, older, todayLogs, meds])
}
