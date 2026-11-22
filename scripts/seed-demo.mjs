// Resets the demo account: 6 sample medicines + 30 days of past dose history (F8) + sample name (F9)
// + two sample documents (F10).
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
// SEED_EMAIL / SEED_PASSWORD: try the script on a throwaway test account instead of the demo.
const { error } = await db.auth.signInWithPassword({
  email: process.env.SEED_EMAIL ?? 'demo@medfriend.jo',
  password: process.env.SEED_PASSWORD ?? '123456',
})
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

// F7: [box size, left now]. Concor is low (5 days) so the refill warning shows straight away.
const stockSetAt = new Date().toISOString()
const samples = [
  ['Glucophage', 500, 'tablet', 1, ['08:00', '20:00'], null, [60, 40]],
  ['Concor', 5, 'tablet', 1, ['08:00'], null, [28, 5]],
  ['Lipitor', 20, 'tablet', 1, ['20:00'], null, [30, 22]],
  ['Aspocid', 81, 'tablet', 1, ['13:00'], null, [30, 18]],
  // F3: "before breakfast" = 30 min before the default breakfast (08:00), the same time every day.
  ['Nexium', 40, 'capsule', 1, ['07:30'], ['breakfast:before'], [14, 9]],
  // Late dose so "Show the next reminder now" (Settings) has a dose to remind until 23:30.
  // Once answered, tap Undo on Today to use it again.
  ['Singulair', 10, 'tablet', 1, ['23:30'], null, [28, 20]],
].map(([name, strengthMg, form, amount, times, anchors, [pack, left]]) => ({
  name, from_list: true, strength_value: strengthMg, strength_unit: 'mg', form, amount,
  times_per_day: times.length, times, anchors: anchors ?? times.map(() => ''), created_at: createdAt,
  pack_size: pack, stock_count: left, stock_set_at: stockSetAt,
}))

const { data: { user } } = await db.auth.getUser()
const del = await db.from('medications').delete().eq('user_id', user.id) // dose logs go with them
if (del.error) throw del.error
// F4: remove photos the demo users added.
const photos = await db.storage.from('pill-photos').list(user.id, { limit: 1000 })
if (photos.error) throw photos.error
if (photos.data.length) {
  const rm = await db.storage.from('pill-photos').remove(photos.data.map((f) => `${user.id}/${f.name}`))
  if (rm.error) throw rm.error
}
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

// F10: two sample documents (clearly marked SAMPLE), made here with the project's Playwright browser:
// a lab result as a PDF and a prescription as a photo. Older demo documents are removed first.
const docsDel = await db.from('documents').delete().eq('user_id', user.id)
if (docsDel.error) throw docsDel.error
const oldDocs = await db.storage.from('documents').list(user.id, { limit: 1000 })
if (oldDocs.error) throw oldDocs.error
if (oldDocs.data.length) {
  const rm = await db.storage.from('documents').remove(oldDocs.data.map((f) => `${user.id}/${f.name}`))
  if (rm.error) throw rm.error
}
const { chromium } = await import('@playwright/test')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 700, height: 900 } })
const labDate = addDays(today, -5)
const rxDate = addDays(today, -12)
const sheet = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 36px; color: #10231d; }
  h1 { font-size: 26px; margin: 0 0 4px; } .sub { color: #4a5a53; margin: 0 0 18px; }
  .sample { display: inline-block; border: 3px solid #9b1c1c; color: #9b1c1c; padding: 4px 12px;
            font-weight: 700; transform: rotate(-4deg); margin-bottom: 14px; }
  table { border-collapse: collapse; width: 100%; font-size: 17px; }
  th, td { border-bottom: 1px solid #c9d6cf; padding: 9px 6px; text-align: start; }
  .rx { font-size: 21px; line-height: 1.8; }
</style></head><body>${body}</body></html>`
await page.setContent(sheet(`
  <div class="sample">SAMPLE · نموذج تجريبي</div>
  <h1>Laboratory result · نتيجة مختبر</h1>
  <p class="sub">Demo patient · مريض تجريبي — ${labDate}</p>
  <table>
    <tr><th>Test</th><th>Result</th><th>Reference range</th></tr>
    <tr><td>HbA1c</td><td>7.1 %</td><td>4.0 – 5.6 %</td></tr>
    <tr><td>Fasting glucose</td><td>138 mg/dL</td><td>70 – 99 mg/dL</td></tr>
    <tr><td>Total cholesterol</td><td>182 mg/dL</td><td>&lt; 200 mg/dL</td></tr>
    <tr><td>Creatinine</td><td>0.9 mg/dL</td><td>0.6 – 1.2 mg/dL</td></tr>
  </table>
  <p class="sub" style="margin-top:24px">Sample data for the Med Friend demo. Not a real result.</p>`))
const labPdf = await page.pdf({ format: 'A4', printBackground: true })
await page.setContent(sheet(`
  <div class="sample">SAMPLE · نموذج تجريبي</div>
  <h1>Prescription · وصفة طبية</h1>
  <p class="sub">Demo patient · مريض تجريبي — ${rxDate}</p>
  <div class="rx">
    Rx<br>
    1. Glucophage 500 mg — 1 tablet twice a day<br>
    2. Concor 5 mg — 1 tablet in the morning<br>
    3. Lipitor 20 mg — 1 tablet in the evening
  </div>
  <p class="sub" style="margin-top:24px">Sample data for the Med Friend demo. Not a real prescription.</p>`))
await page.setViewportSize({ width: 700, height: 460 }) // just the prescription, no empty page below
const rxJpg = await page.screenshot({ type: 'jpeg', quality: 85, fullPage: false })
await browser.close()
for (const [type, date, title, bytes, mime, ext] of [
  ['lab', labDate, 'Sample blood test', labPdf, 'application/pdf', 'pdf'],
  ['prescription', rxDate, 'Sample prescription', rxJpg, 'image/jpeg', 'jpg'],
]) {
  const id = crypto.randomUUID()
  const path = `${user.id}/${id}.${ext}`
  const up = await db.storage.from('documents').upload(path, bytes, { contentType: mime })
  if (up.error) throw up.error
  const row = await db.from('documents')
    .insert({ id, doc_type: type, doc_date: date, title, file_path: path, mime_type: mime })
  if (row.error) throw row.error
}
console.log(`Documents: sample lab result (${labDate}, PDF) and prescription (${rxDate}, photo)`)

console.log(`Demo medicines: ${ins.data.map((m) => m.name).join(', ')}`)
console.log(`History: ${logs.length} answered doses over ${HISTORY_DAYS} days (from ${firstDay})`)
// "My details" (F9): sample name and year of birth for the doctor summary.
// F3: prayer and Ramadan times on for the demo (off by default for new accounts); default meal times.
const profile = await db.auth.updateUser({
  data: {
    full_name: DEMO_NAME,
    birth_year: 1968,
    prayer_times: true,
    meal_times: { breakfast: '08:00', lunch: '14:00', dinner: '20:00' },
  },
})
if (profile.error) throw profile.error

await db.auth.signOut()
