import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { newApiUser, SUPABASE_KEY, SUPABASE_URL } from './helpers'

// Acceptance criteria: docs/specs/DB-supabase.md (RLS). Login screens: tests/auth.spec.ts

test('RLS: one account cannot see or change another account\'s rows', async ({}, testInfo) => {
  // Database check only; the screen size does not matter, so run it once.
  test.skip(testInfo.project.name !== 'phone', 'runs once')

  const a = await newApiUser()
  const b = await newApiUser()

  const { data: med, error: insertError } = await a.db
    .from('medications')
    .insert({ name: 'RLS test medicine', form: 'tablet', amount: 1, times_per_day: 1, times: ['08:00'] })
    .select()
    .single()
  expect(insertError).toBeNull()
  expect(med.user_id).toBe(a.userId)

  try {
    // Owner can read and log a dose.
    const own = await a.db.from('medications').select('id').eq('id', med.id)
    expect(own.data).toHaveLength(1)
    const ownLog = await a.db
      .from('dose_logs')
      .insert({ medication_id: med.id, scheduled_at: new Date().toISOString(), status: 'taken' })
    expect(ownLog.error).toBeNull()

    // The other account sees nothing.
    expect((await b.db.from('medications').select('id')).data).toEqual([])
    expect((await b.db.from('dose_logs').select('id')).data).toEqual([])

    // The other account cannot change or delete it.
    const upd = await b.db.from('medications').update({ name: 'hacked' }).eq('id', med.id).select()
    expect(upd.data).toEqual([])
    const del = await b.db.from('medications').delete().eq('id', med.id).select()
    expect(del.data).toEqual([])

    // The other account cannot write rows in the first account's name...
    const asA = await b.db
      .from('medications')
      .insert({ user_id: a.userId, name: 'x', form: 'tablet', amount: 1, times_per_day: 1 })
    expect(asA.error).not.toBeNull()
    // ...or log a dose against the first account's medicine.
    const foreignLog = await b.db
      .from('dose_logs')
      .insert({ medication_id: med.id, scheduled_at: new Date().toISOString(), status: 'taken' })
    expect(foreignLog.error).not.toBeNull()

    // Without logging in (publishable key only) the tables are closed.
    const noSession = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    expect((await noSession.from('medications').select('id')).error).not.toBeNull()

    // The row is unchanged for its owner.
    const after = await a.db.from('medications').select('name').eq('id', med.id).single()
    expect(after.data?.name).toBe('RLS test medicine')
  } finally {
    // Clean up (dose logs go with the medication).
    await a.db.from('medications').delete().eq('id', med.id)
  }
})
