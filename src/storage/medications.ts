import { ALL_ANCHORS, scheduleChange, type Anchor, type PastSchedule } from '../lib/anchors'
import { supabase } from '../lib/supabase'
import { photoLinks, removeAllPhotos, removeFiles } from './photos'

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
  /** Times before a change (docs/specs/TIMES.md), oldest first; past days use the one that applied then. */
  pastSchedules: PastSchedule[]
  /** F4: the patient's own photo (private Storage path) and a short-lived link to show it. */
  photoPath: string | null
  photoUrl: string | null
  /** F7: units in one box and units left at stockSetAt (all three null = no stock count). */
  packSize: number | null
  stockCount: number | null
  stockSetAt: Date | null
  createdAt: string
}

export type NewMedication = Omit<Medication, 'id' | 'createdAt' | 'photoPath' | 'photoUrl' | 'stockSetAt' | 'pastSchedules'>

const COLUMNS =
  'id, name, from_list, strength_value, strength_unit, form, amount, times_per_day, times, anchors, photo_path, pack_size, stock_count, stock_set_at, past_schedules, created_at'

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
  photo_path: string | null
  pack_size: number | string | null
  stock_count: number | string | null
  stock_set_at: string | null
  past_schedules: unknown
  created_at: string
}

/** Keeps only well-formed entries (the column is plain JSON). */
function pastFrom(value: unknown): PastSchedule[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (p): p is PastSchedule =>
        typeof p === 'object' && p !== null &&
        typeof p.until === 'string' &&
        Array.isArray(p.times) && p.times.every((t: unknown) => typeof t === 'string') &&
        Array.isArray(p.anchors) && p.anchors.length === p.times.length &&
        p.anchors.every((a: unknown) => ALL_ANCHORS.includes(a as Anchor)),
    )
    .map((p) => ({ until: p.until, times: p.times, anchors: p.anchors }))
    .sort((a, b) => a.until.localeCompare(b.until))
}

function fromRow(r: Row, links = new Map<string, string>()): Medication {
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
    pastSchedules: pastFrom(r.past_schedules),
    photoPath: r.photo_path,
    photoUrl: r.photo_path ? (links.get(r.photo_path) ?? null) : null,
    packSize: r.pack_size === null ? null : Number(r.pack_size),
    stockCount: r.stock_count === null ? null : Number(r.stock_count),
    stockSetAt: r.stock_set_at ? new Date(r.stock_set_at) : null,
    createdAt: r.created_at,
  }
}

export async function listMedications(): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select(COLUMNS)
    .order('created_at', { ascending: true })
  if (error) throw error
  const rows = data as Row[]
  const links = await photoLinks(rows.flatMap((r) => (r.photo_path ? [r.photo_path] : [])))
  return rows.map((r) => fromRow(r, links))
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
      ...stockColumns(med.packSize, med.stockCount),
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as Row)
}

/** F7: the box and the count now; both or neither. The moment is the device clock (same clock as dose answers). */
function stockColumns(packSize: number | null, count: number | null) {
  if (packSize === null || count === null) return { pack_size: null, stock_count: null, stock_set_at: null }
  return { pack_size: packSize, stock_count: count, stock_set_at: new Date().toISOString() }
}

/** F7: saves a new box size and count (Set the box size / I got a new box / Correct the count). */
export async function setStock(id: string, packSize: number, count: number): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update(stockColumns(packSize, count))
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  const row = data as Row
  const links = await photoLinks(row.photo_path ? [row.photo_path] : [])
  return fromRow(row, links)
}

/**
 * Change times: saves the new times; today keeps the times it had (kept in past_schedules) and the new ones start
 * tomorrow, so earlier answers keep matching their doses.
 */
export async function updateTimes(med: Medication, times: string[], anchors: Anchor[], today: string): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update({
      times_per_day: times.length,
      ...sortedDoses(times, anchors),
      past_schedules: scheduleChange(med, today),
    })
    .eq('id', med.id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return { ...fromRow(data as Row), photoUrl: med.photoUrl }
}

/** Times sorted, with each dose's anchor kept next to its time. */
function sortedDoses(times: string[], anchors: Anchor[]) {
  const pairs = times.map((time, i) => ({ time, anchor: anchors[i] ?? '' })).sort((a, b) => a.time.localeCompare(b.time))
  return { times: pairs.map((p) => p.time), anchors: pairs.map((p) => p.anchor) }
}

export async function deleteMedication(id: string, photoPath: string | null = null): Promise<void> {
  const { error } = await supabase.from('medications').delete().eq('id', id)
  if (error) throw error
  if (photoPath) await removeFiles([photoPath]) // F4
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
  await removeAllPhotos() // F4
}
