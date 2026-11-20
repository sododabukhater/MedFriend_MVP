# DB — Supabase database (plan, 20 Nov 2026)

> **Update 20 Nov (later):** sign-in changed from anonymous to email + password. See `docs/specs/AUTH.md`.
> Tables and RLS are unchanged. Sections below about anonymous users are history.

## Decisions (owner, 20 Nov)
- **Database: Supabase** (Postgres), replacing "local-first / localStorage only".
- **Sign-in: anonymous.** No sign-in screen. On first visit each browser silently gets its own
  private Supabase user. Its data is in the cloud but reachable only from that browser.
- **One project for app and tests.** Playwright tests use the same database. When the owner asks,
  Claude clears it and seeds demo data.
- **Claude tooling:** official Supabase plugin for Claude Code, installed at project scope
  (`.claude/settings.json`). It gives Claude the Supabase MCP server and Supabase skills.

## What stays in the browser (localStorage)
Only per-device preferences: language (`medfriend.lang`), Demo speed switch.

## Tables (all in `public`, RLS on, owner-only policies)
| Table | Columns |
|---|---|
| `medications` | id uuid pk, user_id uuid → auth.users (on delete cascade, default `auth.uid()`), name text, from_list bool, strength text null, form text, amount numeric, times_per_day int 1–4, times text[] ("08:00"…), created_at timestamptz |
| `dose_logs` (with F1/F8) | id uuid pk, user_id uuid, medication_id uuid → medications (cascade), scheduled_at timestamptz, status text (taken / skipped / snoozed / missed), recorded_at timestamptz |

Security (from the Supabase skill checklist):
- RLS enabled on every table; policies `to authenticated` with `(select auth.uid()) = user_id`
  for select / insert / update / delete; update has both `using` and `with check`.
- Only the **publishable** key goes into the app. Never the secret / service_role key.
- Indexes on `user_id` and `medication_id`.

Later (Tier B): F10 documents go to a private Supabase Storage bucket instead of IndexedDB.

## App changes
- New dependency `@supabase/supabase-js` (exact version pinned, lockfile committed).
- `src/lib/supabase.ts`: client; on startup, sign in anonymously if there is no session.
- `.env` (committed; both values are public by design): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`. Works for Vercel, GitHub Pages and localhost without extra setup.
- "Reset all data" (Settings) deletes this user's rows, signs out, and starts a fresh anonymous user.
- Needs an internet connection; show a clear message when offline or when the database is unreachable.

## Known limits (accepted for the alpha)
- Clearing the browser's site data loses access to that anonymous user's data (rows stay orphaned
  in the database until the owner asks for a clean-up).
- Phone and laptop do not share data (could be added later by linking an email to the anonymous user).
- Health data leaves the device. Fine for an alpha with demo/test data; revisit before real patients.

## Setup steps for the owner (once) — all done 20 Nov
1. Sign up at https://supabase.com (free plan; "Continue with GitHub" is easiest).
2. New project: name `medfriend`, region **Central EU (Frankfurt)** (closest available to Amman),
   generate a database password and save it somewhere safe.
3. Authentication → Sign In / Providers → turn on **Allow anonymous sign-ins** → Save.
4. Authentication → Rate Limits → raise **anonymous sign-ins per hour** (default 30 per IP) to 300,
   because each Playwright test starts as a brand-new visitor.
5. In VS Code, start a new Claude Code session (or reload the window), type `/mcp`, pick
   **supabase** and sign in, so Claude can create the tables.

## Acceptance criteria
1. First visit creates an anonymous user without any screen or click.
2. A medication saved on the live link is still there after a refresh, and is stored in `medications`.
3. A second browser (or private window) does not see the first browser's medications (RLS works).
4. Supabase security advisor shows no errors for the project.
5. Type-check, build and Playwright tests pass.
