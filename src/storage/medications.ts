import { supabase } from '../lib/supabase'

// Supabase table `medications` (docs/specs/DB-supabase.md). RLS keeps each user's rows private.

export const FORMS = ['tablet', 'capsule', 'syrup', 'injection', 'inhaler', 'drops', 'cream', 'other'] as const
export type Form = (typeof FORMS)[number]

export type Medication = {
  id: string
  name: string
  fromList: boolean
  strength: string | null
  form: Form
  amount: number
  timesPerDay: number
  times: string[] // "08:00", sorted
  createdAt: string
}

export type NewMedication = Omit<Medication, 'id' | 'createdAt'>

type Row = {
  id: string
  name: string
  from_list: boolean
  strength: string | null
  form: Form
  amount: number | string
  times_per_day: number
  times: string[]
  created_at: string
}

function fromRow(r: Row): Medication {
  return {
    id: r.id,
    name: r.name,
    fromList: r.from_list,
    strength: r.strength,
    form: r.form,
    amount: Number(r.amount),
    timesPerDay: r.times_per_day,
    times: r.times,
    createdAt: r.created_at,
  }
}

export async function listMedications(): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
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
      strength: med.strength?.trim() || null,
      form: med.form,
      amount: med.amount,
      times_per_day: med.timesPerDay,
      times: [...med.times].sort(),
    })
    .select()
    .single()
  if (error) throw error
  return fromRow(data as Row)
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
