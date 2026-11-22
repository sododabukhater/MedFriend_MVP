// Resets the demo account: 6 sample medicines + 30 days of past dose history (F8) + sample name (F9).
// Run:  node scripts/seed-demo.mjs
// Uses only the public .env values and logs in as the demo user (normal RLS path, no secret key).
// Today's doses are left unanswered, so the demo can use Today and the reminders.
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

const HISTORY_DAYS = 30
const DEMO_NAME = 'مريض تجريبي (Demo patient)'

// ---- Amman dates (same rule as src/lib/time.ts) ----
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})
const parts = (d) => Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]))
const ammanDate = (d) => { const p = parts(d); return `${p.year}-${p.month}-${p.day}` }
function ammanInstant(date, time) {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  const wanted = Date.UTC(y, m - 1, d, h, min)
  let guess = wanted
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess))
    guess += wanted - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  }
  return new Date(guess)
}
const addDays = (date, n) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

// Fixed random numbers, so the history looks the same every time it is reset.
let seed = 20261125
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const today = ammanDate(new Date())
const firstDay = addDays(today, -HISTORY_DAYS)
// Medicines "added" just before the history starts.
const createdAt = ammanInstant(firstDay, '07:00').toISOString()

const samples = [
  ['Glucophage', 500, 'tablet', 1, ['08:00', '20:00']],
  ['Concor', 5, 'tablet', 1, ['08:00']],
  ['Lipitor', 20, 'tablet', 1, ['20:00']],
  ['Aspocid', 81, 'tablet', 1, ['13:00']],
  ['Nexium', 40, 'capsule', 1, ['08:00']],
  // Late dose so "Show the next reminder now" (Settings) has a dose to remind until 23:30.
  // Once answered, tap Undo on Today to use it again.
  ['Singulair', 10, 'tablet', 1, ['23:30']],
].map(([name, strengthMg, form, amount, times]) => ({
  name, from_list: true, strength_value: strengthMg, strength_unit: 'mg', form, amount,
  times_per_day: times.length, times, created_at: createdAt,
}))

const { data: { user } } = await db.auth.getUser()
const del = await db.from('medications').delete().eq('user_id', user.id) // dose logs go with them
if (del.error) throw del.error
const ins = await db.from('medications').insert(samples).select('id, name, times')
if (ins.error) throw ins.error

// History: yesterday back to 30 days ago. About 80% taken (mostly on time, some late), 8% skipped, rest missed.
const logs = []
for (let i = 1; i <= HISTORY_DAYS; i++) {
  const date = addDays(today, -i)
  for (const med of ins.data) {
    for (const time of med.times) {
      const scheduled = ammanInstant(date, time)
      const r = random()
      if (r < 0.8) {
        const late = random() < 0.12 ? 70 + random() * 60 : random() * 40 // minutes
        logs.push({ medication_id: med.id, scheduled_at: scheduled.toISOString(), status: 'taken',
          recorded_at: new Date(scheduled.getTime() + late * 60_000).toISOString() })
      } else if (r < 0.88) {
        logs.push({ medication_id: med.id, scheduled_at: scheduled.toISOString(), status: 'skipped',
          recorded_at: new Date(scheduled.getTime() + random() * 20 * 60_000).toISOString() })
      } // else: no answer = missed
    }
  }
}
const logIns = await db.from('dose_logs').insert(logs)
if (logIns.error) throw logIns.error

console.log(`Demo medicines: ${ins.data.map((m) => m.name).join(', ')}`)
console.log(`History: ${logs.length} answered doses over ${HISTORY_DAYS} days (from ${firstDay})`)
// "My details" (F9): sample name and year of birth for the doctor summary.
const profile = await db.auth.updateUser({ data: { full_name: DEMO_NAME, birth_year: 1968 } })
if (profile.error) throw profile.error

await db.auth.signOut()
