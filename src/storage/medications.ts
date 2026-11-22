import type { Anchor } from '../lib/anchors'
import { supabase } from '../lib/supabase'

// Supabase table `medications` (docs/specs/DB-supabase.md). RLS keeps each user's rows private.

export const FORMS = ['tablet', 'capsule', 'syrup', 'injection', 'inhaler', 'drops', 'cream', 'other'] as const
export type Form = (typeof FORMS)[number]

/** Strength units (fixed list; the database refuses anything else). */
export const STRENGTH_UNITS = ['mg', 'mcg', 'g', 'ml', 'unit', 'percent'] as const
export type StrengthUnit = (typeof STRENGTH_UNITS)[number]
export const MAX_STRENGTH = 99999

export type Medication = {
  id: string
  name: string
  fromList: boolean
  /** Both set or both null (optional). */
  strengthValue: number | null
  strengthUnit: StrengthUnit | null
  form: Form
  amount: number
  timesPerDay: number
  times: string[] // "08:00", sorted
  /** F3: one per dose, same order as times; '' = clock time. Anchored doses get each day's own time. */
  anchors: Anchor[]
  createdAt: string
}

export type NewMedication = Omit<Medication, 'id' | 'createdAt'>

type Row = {
  id: string
  name: string
  from_list: boolean
  strength_value: number | string | null
  strength_unit: StrengthUnit | null
  form: Form
  amount: number | string
  times_per_day: number
  times: string[]
  anchors: Anchor[] | null
  created_at: string
}

function fromRow(r: Row): Medication {
  return {
    id: r.id,
    name: r.name,
    fromList: r.from_list,
    strengthValue: r.strength_value === null ? null : Number(r.strength_value),
    strengthUnit: r.strength_unit,
    form: r.form,
    amount: Number(r.amount),
    timesPerDay: r.times_per_day,
    times: r.times,
    anchors: r.anchors ?? r.times.map(() => ''),
    createdAt: r.created_at,
  }
}

export async function listMedications(): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('id, name, from_list, strength_value, strength_unit, form, amount, times_per_day, times, anchors, created_at')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as Row[]).map(fromRow)
}

export async function addMedication(med: NewMedication): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .insert({
      name: med.name.trim(),
      from_list: med.fromList,
      strength_value: med.strengthUnit ? med.strengthValue : null,
      strength_unit: med.strengthValue ? med.strengthUnit : null,
      form: med.form,
      amount: med.amount,
      times_per_day: med.timesPerDay,
      ...sortedDoses(med.times, med.anchors),
    })
    .select('id, name, from_list, strength_value, strength_unit, form, amount, times_per_day, times, anchors, created_at')
    .single()
  if (error) throw error
  return fromRow(data as Row)
}

/** Times sorted, with each dose's anchor kept next to its time. */
function sortedDoses(times: string[], anchors: Anchor[]) {
  const pairs = times.map((time, i) => ({ time, anchor: anchors[i] ?? '' })).sort((a, b) => a.time.localeCompare(b.time))
  return { times: pairs.map((p) => p.time), anchors: pairs.map((p) => p.anchor) }
}

export async function deleteMedication(id: string): Promise<void> {
  const { error } = await supabase.from('medications').delete().eq('id', id)
  if (error) throw error
}

/** Suggested clock times only (one per time-of-day group); never doses. */
export const SUGGESTED_TIMES: Record<number, string[]> = {
  1: ['08:00'],
  2: ['08:00', '20:00'],
  3: ['08:00', '14:00', '20:00'],
  4: ['08:00', '13:00', '18:00', '22:00'],
}

/** − / + step for the amount, by form. */
export function amountStep(form: Form): number {
  if (form === 'tablet') return 0.5
  if (form === 'syrup') return 2.5
  return 1
}

/**
 * Cleans what the patient types in the strength box: Arabic digits become 0-9, "٫" or "," becomes ".",
 * anything else is dropped, at most one decimal point and 2 decimals. Returns "" for empty.
 */
export function cleanStrengthInput(text: string): string {
  const western = text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫,]/g, '.')
    .replace(/[^0-9.]/g, '')
  const [whole, ...rest] = western.split('.')
  const cleaned = rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole
  return cleaned.slice(0, 8)
}

/** "Reset all data": deletes every medicine of this account; their dose logs go with them (on delete cascade). */
export async function deleteAllMedications(): Promise<void> {
  // RLS limits this to the logged-in user's rows; the filter is required by the API and matches every row.
  const { error } = await supabase.from('medications').delete().not('id', 'is', null)
  if (error) throw error
}
