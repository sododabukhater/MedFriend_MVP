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

/** All logs for doses scheduled in [from, to). */
export async function listDoseLogs(from: Date, to: Date): Promise<DoseLog[]> {
  const { data, error } = await supabase
    .from('dose_logs')
    .select('medication_id, scheduled_at, status, recorded_at')
    .gte('scheduled_at', from.toISOString())
    .lt('scheduled_at', to.toISOString())
  if (error) throw error
  return (data as Row[]).map(fromRow)
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
