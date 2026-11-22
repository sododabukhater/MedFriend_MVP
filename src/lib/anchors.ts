import type { User } from '@supabase/supabase-js'
import type { MessageKey } from '../i18n'
import { prayerTimes, type Prayer } from './prayer'
import { supabase } from './supabase'

// F3: a dose can be set by a moment in the day ("after Fajr", "before breakfast", "with Iftar").
// The clock time is worked out for each date. Spec: docs/specs/F3.md

export const PRAYER_ANCHORS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export const RAMADAN_ANCHORS = ['suhoor', 'iftar'] as const
export const MEALS = ['breakfast', 'lunch', 'dinner'] as const
export const RELATIONS = ['before', 'with', 'after'] as const

export type Meal = (typeof MEALS)[number]
export type Relation = (typeof RELATIONS)[number]
/** '' = a plain clock time. */
export type Anchor =
  | ''
  | (typeof PRAYER_ANCHORS)[number]
  | (typeof RAMADAN_ANCHORS)[number]
  | `${Meal}:${Relation}`

export const ALL_ANCHORS: Anchor[] = [
  '',
  ...PRAYER_ANCHORS,
  ...RAMADAN_ANCHORS,
  ...MEALS.flatMap((m) => RELATIONS.map((r) => `${m}:${r}` as Anchor)),
]

/** Minutes after the prayer time for "after <prayer>"; before/after a meal; Suhoor before Fajr. */
export const AFTER_PRAYER_MIN = 15
export const MEAL_OFFSET_MIN = 30
export const SUHOOR_BEFORE_FAJR_MIN = 45

export type MealTimes = Record<Meal, string>
export const DEFAULT_MEALS: MealTimes = { breakfast: '08:00', lunch: '14:00', dinner: '20:00' }

/** The patient's day: meal times and whether prayer / Ramadan times are on (off by default). */
export type Prefs = { meals: MealTimes; prayer: boolean }
export const DEFAULT_PREFS: Prefs = { meals: DEFAULT_MEALS, prayer: false }

const isClock = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)

/** Stored with the login account (Supabase Auth user metadata), like "My details". */
export function prefsOf(user: User | null): Prefs {
  const meta = (user?.user_metadata ?? {}) as { meal_times?: Partial<Record<Meal, unknown>>; prayer_times?: unknown }
  const saved = meta.meal_times ?? {}
  return {
    meals: {
      breakfast: isClock(saved.breakfast) ? saved.breakfast : DEFAULT_MEALS.breakfast,
      lunch: isClock(saved.lunch) ? saved.lunch : DEFAULT_MEALS.lunch,
      dinner: isClock(saved.dinner) ? saved.dinner : DEFAULT_MEALS.dinner,
    },
    prayer: meta.prayer_times === true,
  }
}

export async function savePrefs(prefs: Partial<Prefs>): Promise<void> {
  const data: Record<string, unknown> = {}
  if (prefs.meals) data.meal_times = prefs.meals
  if (prefs.prayer !== undefined) data.prayer_times = prefs.prayer
  const { error } = await supabase.auth.updateUser({ data })
  if (error) throw error
}

export function isPrayerAnchor(a: Anchor): boolean {
  return (PRAYER_ANCHORS as readonly string[]).includes(a) || (RAMADAN_ANCHORS as readonly string[]).includes(a)
}

/** "HH:MM" plus n minutes, kept within the same day (00:00–23:59). */
export function addMinutes(time: string, n: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + n))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** The clock time of an anchor on an Amman date ("YYYY-MM-DD"). */
export function anchorTime(anchor: Exclude<Anchor, ''>, date: string, prefs: Prefs): string {
  if (anchor === 'suhoor') return addMinutes(prayerTimes(date).fajr, -SUHOOR_BEFORE_FAJR_MIN)
  if (anchor === 'iftar') return prayerTimes(date).maghrib
  if ((PRAYER_ANCHORS as readonly string[]).includes(anchor)) {
    return addMinutes(prayerTimes(date)[anchor as Prayer], AFTER_PRAYER_MIN)
  }
  const [meal, relation] = anchor.split(':') as [Meal, Relation]
  const offset = relation === 'before' ? -MEAL_OFFSET_MIN : relation === 'after' ? MEAL_OFFSET_MIN : 0
  return addMinutes(prefs.meals[meal], offset)
}

/** A medicine's doses on a date: anchored doses get that day's time, the others keep their clock time. */
export function doseTimesOn(
  med: { times: string[]; anchors: Anchor[] },
  date: string,
  prefs: Prefs,
): { time: string; anchor: Anchor }[] {
  return med.times.map((time, i) => {
    const anchor = med.anchors[i] ?? ''
    return { time: anchor ? anchorTime(anchor, date, prefs) : time, anchor }
  })
}

/** "After Fajr", "Before breakfast", "With Iftar". */
export function anchorLabel(t: (key: MessageKey) => string, anchor: Anchor): string {
  return anchor ? t(`anchor.${anchor}` as MessageKey) : ''
}
