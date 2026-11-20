# Handoff — current status (read this first)

Last updated: Fri 20 Nov 2026, end of the first VS Code (local) session.
`CLAUDE.md` is the rulebook. This file is the current state of the work.

## ▶ Start here (new chat)
The previous chat could not use the Supabase tools (the plugin was installed mid-chat), so work
continues in a new chat. The owner has already done the setup steps 1–5 in `docs/specs/DB-supabase.md`
(account, project `medfriend` in Frankfurt, anonymous sign-ins on, rate limit raised, `/mcp` sign-in).
`claude mcp list` showed `plugin:supabase:supabase ✔ Connected`.

**Uncommitted work is on disk** (Playwright setup, Supabase plan, doc/rule updates). Not committed
because Git on this PC has no name/email. Ask the owner first: use `sododabukhater` +
their Gmail (as in their earlier commit) as a **repo-local** `git config`? Then commit it as
"Add Playwright tests and Supabase plan". Push only when the owner says so.

**Supabase database setup: DONE on 20 Nov (second session), not yet committed.**
- Project `medfriend`, ref `zotspmzlyopvkqsrgrng` (region shows as eu-west-1 / Ireland, not Frankfurt; fine).
- Migration `supabase/migrations/20261120180000_init_medications_dose_logs.sql` applied via MCP:
  `medications` + `dose_logs`, RLS owner-only, grants to `authenticated` only (anon revoked), indexes.
  `dose_logs` has a composite FK `(medication_id, user_id)` so a log can only point at the user's own medicine,
  and `unique (medication_id, scheduled_at)` (one row per scheduled dose).
- Advisors: no errors. Security WARN "Anonymous Access Policies" is expected (anonymous sign-in is the design).
- `.env` (committed), `src/lib/supabase.ts` (client + `ensureSession()`), `src/lib/useSession.ts`,
  `src/vite-env.d.ts`. App shows an alert with "Try again" when Supabase is unreachable.
  `.phone-frame` has `data-session="loading|ready|error"` for tests.
- `@supabase/supabase-js` 2.119.2 (exact). No `@types/node`: `tests/node-env.d.ts` declares `process`.
- Tests: `tests/DB-supabase.spec.ts` (silent sign-in, refresh keeps user, second browser = new user,
  offline message + recovery, RLS cross-user checks). All pass (45/45 over 3 repeats).
- Each `npm test` run creates ~20 empty anonymous users (rate limit 300/hour ≈ 15 runs/hour).

Do next:
1. Commit (after git name/email is set) and push when the owner says so; then the owner checks the live link.
2. **F6 "Add medication": BUILT 20 Nov, not yet committed.** Owner approved A–D (all defaults).
   4-step wizard + review (`src/screens/AddMedication/`), name suggestions (`src/components/Autocomplete.tsx`,
   `src/data/drugs.ts`), cards with Delete + confirm (`src/components/MedicationCard.tsx`),
   Supabase calls in `src/storage/medications.ts`. `t(key, vars)` now fills `{n}` placeholders.
   Tests `tests/F6.spec.ts`: all pass (39 total + 2× repeat of F6).
3. **Email + password login: BUILT 20 Nov** (spec `docs/specs/AUTH.md`). Replaces anonymous sign-in.
   `src/lib/auth.ts` (actions, error messages, `DEMO_ACCOUNT`), `src/lib/useAuth.ts` (login state, reset-link
   recovery), `src/screens/Auth/AuthScreens.tsx`. `.phone-frame` now has `data-auth="loading|signedOut|signedIn"`.
   Demo account `demo@medfriend.jo` / `123456` (owner-created) with 5 medicines; reset with `node scripts/seed-demo.mjs`.
   Tests: `tests/helpers.ts` signs up a throwaway `@mailinator.com` account per test. 55 pass (2 runs).
   Commits so far: `ee1aa1a` DB, `d6f115e` F6; auth commit follows. Nothing pushed yet.
   Open: the "welcome screen" in CLAUDE.md (Start empty / Try demo data) now overlaps with the login
   screen's demo button; decide with the owner when building it. Anonymous sign-ins can be switched off in
   Supabase; ~100 empty anonymous users and many throwaway test users can be deleted when the owner asks.

Owner said on 20 Nov: **skip code reviews for now.** Playwright (headless) for every change is still required.

## About the owner
- Industrial engineer / innovation background, **no coding experience**. Explain every step in plain words.
- Follow the working rules in `CLAUDE.md`: plan first, wait for approval, one feature per commit,
  type-check + build must pass, then push and tell the owner exactly what to click to test.

## Live links (both update automatically on every push to `main`)
| Link | Notes |
|---|---|
| https://sododabukhater.github.io/MedFriend_MVP/ | **Use this one.** GitHub Pages, built by `.github/workflows/pages.yml`. |
| https://medfriendmvp.vercel.app | Vercel. Deploys fine, but the owner's network gives `ERR_CONNECTION_RESET` for `*.vercel.app` (not tested on mobile data yet). |

Repo settings already done: GitHub → Settings → Pages → Source = **GitHub Actions**.

## Branches
- `main` = live. All work so far is on `main`.
- `claude/magical-rubin-3lm9ke` = the cloud session's branch, identical to `main`. Can be ignored or deleted.

## Done
| Step | Commit message starts with | Spec |
|---|---|---|
| F0 Project setup (Vite + React + TS, phone frame, home screen) | `F0:` | `docs/specs/F0-setup.md` |
| GitHub Pages backup hosting | `Add GitHub Pages` | — |
| F12 Language switch, English default during build | `F12:` | `docs/specs/F12-language-switch.md` |

Owner tested F0 on the GitHub Pages link on a laptop: OK. Phone test and F12 test not yet confirmed.

## Key decisions
1. **English first (20 Nov):** English is the default while building. Arabic is still written for every
   new string in `src/i18n/ar.json` at the same time. Before the Tuesday code freeze: set
   `DEFAULT_LANG = 'ar'` in `src/i18n/index.tsx` and do one Arabic review pass.
2. **Font:** Noto Sans Arabic from Google Fonts (link in `index.html`).
3. **No ESLint, no router, no UI framework.** Dependencies are only react, react-dom, vite,
   @vitejs/plugin-react, typescript, @types/react, @types/react-dom, and (dev-only, approved 20 Nov
   for local testing) @playwright/test, and @supabase/supabase-js (approved with the DB plan). Ask before adding any.
4. **Two build modes:** `npm run build` (Vercel, base `/`) and `npm run build:pages`
   (GitHub Pages, base `/MedFriend_MVP/`). Set in `vite.config.ts`. Use `import.meta.env.BASE_URL`
   for any asset path in code; never hard-code `/`.

5. **Database = Supabase (20 Nov)**, anonymous sign-in, one project for app and tests.
   Plan: `docs/specs/DB-supabase.md`. Supabase plugin installed at project scope
   (`.claude/settings.json`). Project created and plugin signed in on 20 Nov; tables created 20 Nov.
   Tests use the same database; when the owner asks, clear it and seed demo data.

## Code map
- `src/main.tsx`: entry point, wraps the app in `I18nProvider`
- `src/App.tsx`: home screen (title, tagline, empty state, "Add medication" button that does nothing yet)
- `src/i18n/index.tsx`: `useI18n()` gives `{ lang, setLang, t }`; language saved in localStorage `medfriend.lang`
- `src/i18n/en.json`, `src/i18n/ar.json`: all user-facing text (same keys in both)
- `src/components/LanguageSwitch.tsx`: the "العربية / English" pill
- `src/index.css`: design tokens (colours, 20px body text, 48px minimum tap size), phone frame. Logical CSS properties only.

## Feature order
1. Supabase database setup: done 20 Nov (see "Start here").
2. F6-lite "Add medication": plan in `docs/specs/F6.md`, waiting for answers A–D. Do not code before approval.

After F6, the agreed order is:
2. Welcome screen (Start empty / Try with demo data) + Settings (reset all data, disclaimer)
3. F2 Today view
4. F1 Reminders with Demo speed
5. F8 Dose log + adherence %
Then Tier B on Tuesday morning only if Tier A passes.

## Commands
```bash
npm install          # once, after cloning
npm run dev          # local preview at http://localhost:5173
npm run typecheck    # must pass
npm run build        # must pass
npm test             # Playwright tests, headless only (starts the dev server itself); must pass
npm run test:report  # open the HTML report of the last run
```
Needs Node.js 20.19 or newer (Vite 8). TypeScript is version 7.

## Local development and testing (since 20 Nov: owner now works in VS Code on Windows)
- Node 26 and npm 11 are installed locally, so `npm run dev` works at http://localhost:5173.
- Playwright config: `playwright.config.ts`. Tests live in `tests/`. Every test runs twice:
  as a phone (Pixel 7) and as a laptop (1280×800), in the Asia/Amman time zone.
- Each test clears localStorage first, so it starts as a first-time visitor.
- Every addition gets a `tests/Fx.spec.ts` that checks its acceptance criteria (rule in `CLAUDE.md`).
- Headless only (owner decision, 20 Nov). Headed mode was tried and dropped.
- Git on this PC has no user name/email configured yet; set it before committing.

## Gotchas found so far
- The cloud session could push only after the owner connected GitHub to Claude (claude.ai/connect-github).
- Browsers cache the old version: after a deploy, hard refresh (Ctrl+Shift+R) if a change does not show.
