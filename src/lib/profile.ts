import type { User } from '@supabase/supabase-js'
import type { MessageKey } from '../i18n'
import { supabase } from './supabase'

// "My details" (F9): the patient's name and year of birth, stored with the login account
// (Supabase Auth user metadata). No table: only the patient can read or change it. Spec: docs/specs/F9.md

export type Profile = { name: string; birthYear: number | null }

export const MIN_BIRTH_YEAR = 1900
export const MAX_NAME = 80

export function profileOf(user: User): Profile {
  const meta = (user.user_metadata ?? {}) as { full_name?: unknown; birth_year?: unknown }
  return {
    name: typeof meta.full_name === 'string' ? meta.full_name : '',
    birthYear: typeof meta.birth_year === 'number' ? meta.birth_year : null,
  }
}

/** Arabic / Persian digits → 0-9, everything else that is not a digit dropped. */
export function cleanYearInput(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '')
    .slice(0, 4)
}

/** Checks the boxes; returns the profile to save, or the message to show. */
export function checkProfile(
  name: string,
  year: string,
  thisYear: number,
): { ok: true; profile: Profile } | { ok: false; error: MessageKey } {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'profile.err.name' }
  if (year === '') return { ok: true, profile: { name: trimmed, birthYear: null } }
  const n = Number(year)
  if (!Number.isInteger(n) || n < MIN_BIRTH_YEAR || n > thisYear) return { ok: false, error: 'profile.err.year' }
  return { ok: true, profile: { name: trimmed, birthYear: n } }
}

export async function saveProfile(profile: Profile): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { full_name: profile.name, birth_year: profile.birthYear },
  })
  if (error) throw error
}
