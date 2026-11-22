import { supabase } from '../lib/supabase'

// Supabase table `dose_logs`: one row per answered dose (unique medication_id + scheduled_at).
// No row = not answered yet. Spec: docs/specs/F2.md (and later F1 / F8).

export type DoseStatus = 'taken' | 'skipped' | 'snoozed' | 'missed'

export type DoseLog = {
  medicationId: string
  scheduledAt: Date
  status: DoseStatus
  recordedAt: Date
}

type Row = { medication_id: string; scheduled_at: string; status: DoseStatus; recorded_at: string }

function fromRow(r: Row): DoseLog {
  return {
    medicationId: r.medication_id,
    scheduledAt: new Date(r.scheduled_at),
    status: r.status,
    recordedAt: new Date(r.recorded_at),
  }
}

// Supabase returns at most 1000 rows per request, so long lists are read page by page.
const PAGE = 1000

type Page = (start: number, end: number) => PromiseLike<{ data: unknown; error: unknown }>

async function allRows(page: Page): Promise<DoseLog[]> {
  const out: Row[] = []
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await page(start, start + PAGE - 1)
    if (error) throw error
    const rows = data as Row[]
    out.push(...rows)
    if (rows.length < PAGE) return out.map(fromRow)
  }
}

const COLUMNS = 'medication_id, scheduled_at, status, recorded_at'

/** All logs for doses scheduled in [from, to). */
export async function listDoseLogs(from: Date, to: Date): Promise<DoseLog[]> {
  return allRows((start, end) =>
    supabase
      .from('dose_logs')
      .select(COLUMNS)
      .gte('scheduled_at', from.toISOString())
      .lt('scheduled_at', to.toISOString())
      .order('scheduled_at')
      .order('medication_id')
      .range(start, end),
  )
}

/** F7: taken doses recorded since `since`, for doses scheduled before `before` (today's come live from useDoses). */
export async function listTakenBefore(since: Date, before: Date): Promise<DoseLog[]> {
  return allRows((start, end) =>
    supabase
      .from('dose_logs')
      .select(COLUMNS)
      .eq('status', 'taken')
      .gte('recorded_at', since.toISOString())
      .lt('scheduled_at', before.toISOString())
      .order('scheduled_at')
      .order('medication_id')
      .range(start, end),
  )
}

/** Records (or changes) the answer for one dose. */
export async function markDose(medicationId: string, scheduledAt: Date, status: DoseStatus): Promise<DoseLog> {
  const { data, error } = await supabase
    .from('dose_logs')
    .upsert(
      {
        medication_id: medicationId,
        scheduled_at: scheduledAt.toISOString(),
        status,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: 'medication_id,scheduled_at' },
    )
    .select('medication_id, scheduled_at, status, recorded_at')
    .single()
  if (error) throw error
  return fromRow(data as Row)
}

/** Removes the answer for one dose (Undo). */
export async function undoDose(medicationId: string, scheduledAt: Date): Promise<void> {
  const { error } = await supabase
    .from('dose_logs')
    .delete()
    .eq('medication_id', medicationId)
    .eq('scheduled_at', scheduledAt.toISOString())
  if (error) throw error
}

/** Key to match a dose with its log. */
export function doseKey(medicationId: string, scheduledAt: Date): string {
  return `${medicationId}@${scheduledAt.getTime()}`
}
