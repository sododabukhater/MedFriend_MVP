// Resets the demo account's medicines to the 5 samples.  Run:  node scripts/seed-demo.mjs
// Uses only the public .env values and logs in as the demo user (normal RLS path, no secret key).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => line.split(/=(.*)/s).slice(0, 2)),
)
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Same values as DEMO_ACCOUNT in src/lib/auth.ts (public on purpose: demo data only).
const { error } = await db.auth.signInWithPassword({ email: 'demo@medfriend.jo', password: '123456' })
if (error) throw error

const samples = [
  ['Glucophage', 500, 'tablet', 1, ['08:00', '20:00']],
  ['Concor', 5, 'tablet', 1, ['08:00']],
  ['Lipitor', 20, 'tablet', 1, ['20:00']],
  ['Aspocid', 81, 'tablet', 1, ['13:00']],
  ['Nexium', 40, 'capsule', 1, ['08:00']],
].map(([name, strengthMg, form, amount, times]) => ({
  name, from_list: true, strength_value: strengthMg, strength_unit: 'mg', form, amount, times_per_day: times.length, times,
}))

const { data: { user } } = await db.auth.getUser()
const del = await db.from('medications').delete().eq('user_id', user.id)
if (del.error) throw del.error
const ins = await db.from('medications').insert(samples).select('name')
if (ins.error) throw ins.error
console.log('Demo medicines:', ins.data.map((m) => m.name).join(', '))
await db.auth.signOut()
