# Handoff — current status (read this first)

Last updated: **Sun 22 Nov 2026** (end of the third VS Code session).
`CLAUDE.md` is the rulebook. This file is the current state of the work. Deadline: live and tested by
**Wed 25 Nov**; **code freeze Tue 24 Nov evening**.

## ▶ Start here (new chat)
1. Everything is committed and pushed to `main`; the live link is up to date. Working tree is clean.
2. **Tier A is done** (F6, F2, F1, F8 + login, Settings, Progress). 102 Playwright tests pass.
3. **Next step: the design revamp. The mock-up is done and WAITING FOR THE OWNER'S APPROVAL.**
   - Load the skill `frontend-design:frontend-design` (it is now installed) before building.
   - Mock-up (6 phone screens, a claude.ai design canvas, private to the owner):
     https://claude.ai/artifact/XwDLEQAjvRqnRnXAg7pwcj. Source copy in `docs/design-mockup/*.dc.html`
     (reference only; not part of the app build).
   - Ask the owner: approve, or what to change. Only after approval change app code (see "Design revamp" below).
   - **Behind schedule** (it is Sun 22 Nov; the revamp was planned for Sat). Keep the revamp to ~4 h; if needed,
     propose cutting F7 and F10 early (CLAUDE.md cut line).
4. Then continue the plan one feature at a time: plan → owner approval → build → tests → commit → push →
   tell the owner exactly what to click.

## Design revamp (mock-up shown 20–22 Nov, not yet approved)
Design idea: the day's four parts each get one soft colour; that colour is the only bold element (it also
prepares F3 prayer/meal anchors). Everything else is quiet: white, dark text, one green for actions.
- **Colours:** page `#EEF3F0`, cards `#FFFFFF`, text `#10231D`, muted text `#4A5A53`, action green `#0A6B52`
  (white text on it), lines `#E1E8E4`, "Missed" text `#9B1C1C`, focus ring keep `#F2A900`.
  Day parts (background / text): morning `#FCEFCF`/`#5C4108`, noon `#DCEEF8`/`#123F5C`,
  evening `#F8DFD2`/`#6B2E14`, night `#E2E1F3`/`#2A2860`.
- **Font:** Readex Pro (Google Fonts, Arabic + Latin, weights 400/500/600/700) replaces Noto Sans Arabic.
  Big tabular numbers for dose times (56–64px).
- **Today:** top card = the dose due now (or next), tinted with its day-part colour: big time, name + strength,
  amount, one big "I took it" button, small "Remind me later" / "Skip" under it. Then "4 of 7 taken" with a
  7-segment bar. Then one white box per day part (coloured header with icon) holding compact rows:
  time | name + amount | status ("✓ 08:12" green, "Missed" red, "Later"). No repeated Taken/Skip on every row:
  tapping a row opens Taken / Skip / Undo for that dose (tests must be updated for this).
- **Reminder:** a bottom panel over a dimmed screen (replaces the top banner), tinted by day part:
  big time, medicine, "I took it", "Remind me in 15 minutes", "Skip this dose" (text link).
- **My medicines:** one white list; each medicine: name + strength, "1 tablet, twice a day", time chips in
  day-part colours. One big "Add a medicine" button fixed above the tab bar.
- **Progress:** switch "Last 7 days / Last 30 days"; sentence "You took 40 of 48 doses this week" + 7 day bars
  (Sat…Today); per-medicine rows with % and a thin bar; dose log behind a "See every dose" button.
- **Settings:** Language switch (العربية / English); "For the demo": Demo speed switch + "Show the next reminder
  now"; Account: email, Log out, **Reset all data** (red outline, needs a confirm step; deletes the user's
  medications and dose logs); disclaimer line at the bottom.
- **Tab bar:** line icons (sun, pill, bars, gear) instead of emoji. Language pill stays in screen headers.
- **Login:** not drawn; same font, colours and buttons.
- Avoid: ALL-CAPS labels (today's "MORNING"), coloured side borders on cards, emoji icons, middle-dot strings.
- Arabic copy used in the mock-up follows `ar.json` wording (أخذتها، تخطّي، فاتت، ذكّرني بعد 15 دقيقة).

## About the owner
- Industrial engineer / innovation background, **no coding experience**. Explain in plain words, short.
- Answers questions best with multiple-choice options (AskUserQuestion) with a recommended default.
  If a question is unclear to them they say "explain": then re-explain without jargon.
- Owner said on 20 Nov: **skip code reviews for now.** Headless Playwright tests for every change are still required.
- Owner tests on the GitHub Pages link. They may decline some database actions (they declined: writing users
  directly into `auth.users`, and dropping the old `strength` column). Ask, don't retry.

## Plan (decided by the owner on 20 Nov: build everything)
Order (each one: short plan → approval → build). Cut from the bottom if behind on Monday evening (F7 first, then F10).

| # | Item | Estimate | Target day | Notes |
|---|---|---|---|---|
| 1 | **Design revamp** of all screens + "Reset all data" in Settings | 4–5 h | Sat | Simplest, most user-friendly UI for 35–65; keep F11 rules (≥18px text, ≥48px buttons, high contrast, one main action) and RTL |
| 2 | **F9** Arabic summary for doctors: printable page + WhatsApp share | 2–3 h | Sat | |
| 3 | **F3** Prayer and meal anchors ("after Fajr", "with Iftar"), Amman prayer times | ~4 h | Sun | Calculate in-app (no dependency) or ask to add a library |
| 4 | **F4** Own-pill photo card (photo on the medicine and in the reminder) | ~3 h | Sun | Photos in a private Supabase Storage bucket (owner-only RLS) |
| 5 | **F5** Arabic voice dose readout | ~2 h | Mon | Browser `speechSynthesis`; show "Voice not available" if no Arabic voice |
| 6 | **F10** Document vault (lab results / prescriptions, tag by date and type) | 3–4 h | Mon | Supabase Storage |
| 7 | **F7** Stock count + low-stock refill alert | 2–3 h | Mon/Tue | |
| — | **Tuesday:** `DEFAULT_LANG = 'ar'` in `src/i18n/index.tsx`, Arabic review pass (REVIEW-AR items), run `node scripts/seed-demo.mjs`, code freeze | | Tue | |

Decided 20 Nov (owner): **drop the welcome screen** (Start empty / Try demo data). The login screen's
"Use the demo account" button covers it. Update CLAUDE.md's "First visit" line during the revamp.

## Done (all on `main`, all pushed)
| Commit | What | Spec | Tests |
|---|---|---|---|
| `705a12a` | F0 setup: Vite + React + TS, phone frame | `docs/specs/F0-setup.md` | |
| `7050ea6` | GitHub Pages backup hosting | | |
| `2253376` | F12 language switch (English default during build) | `docs/specs/F12-language-switch.md` | `tests/home.spec.ts` |
| `ee1aa1a` | Supabase DB (tables, RLS) + Playwright setup | `docs/specs/DB-supabase.md` | `tests/DB-supabase.spec.ts` |
| `d6f115e` | F6 Add medication (4 steps, name suggestions, delete + confirm) | `docs/specs/F6.md` | `tests/F6.spec.ts` |
| `e5b87e0` | Email + password login, sign-up, forgot password, demo account | `docs/specs/AUTH.md` | `tests/auth.spec.ts` |
| `1a385e8` | F6 strength = number + unit (mg, mcg, g, ml, units, %) | `docs/specs/F6.md` | `tests/F6.spec.ts` |
| `586b5df` | F2 Today view with Taken / Skip / Undo, bottom tabs | `docs/specs/F2.md` | `tests/F2.spec.ts` |
| `e989e89` | F1 Reminders (banner, snooze, follow-up, chime) + Settings tab with Demo speed | `docs/specs/F1.md` | `tests/F1.spec.ts` |
| `89dc87b` | Demo account: 23:30 dose so the reminder demo works in the evening | | |
| `622a0d2` | F8 Progress tab: adherence % 7/30 days, dose log; 30 days of demo history | `docs/specs/F8.md` | `tests/F8.spec.ts` |
| `d982e7d` | Plan: build all features (F4, F5 added) + UI revamp first | | |

## How the app works now
- **Login first.** Email + password (Supabase Auth). "Confirm email" is OFF (sign-up logs in at once).
  Forgot password uses Supabase's built-in email (only reaches the owner's Supabase team, ~2/hour).
- **Demo account** (button on the login screen): `demo@medfriend.jo` / `123456`, public on purpose,
  6 medicines incl. Singulair at 23:30 (so "Show the next reminder now" works until 23:30) and 30 days of history.
  Reset: `node scripts/seed-demo.mjs`. **Run it Tuesday evening or Wednesday morning** so the history ends
  the day before the professor's demo (history is fixed; days after the reset count as Missed).
  Shared account: if someone answers the 23:30 dose, tap Undo on Today to reuse the reminder demo.
- The owner created two personal accounts in the dashboard (Gmail, Outlook). **Never put them in code or docs.**
- **4 bottom tabs:** Today | My medicines | Progress | Settings. The app opens on Today.
  The reminder banner shows on every tab. Log out, account email, Demo speed, "Show the next reminder now"
  and the disclaimer are in Settings.
- **Rules:** a dose is "Due now" from its time until 60 min later, then "Missed". Doses before a medicine was
  added never count. Follow-up and snooze: 15 min. Demo speed (per device): every minute = 1 second.
  Adherence = Taken ÷ decided doses (Skipped counts as not taken); "on time" = taken within 1 hour.

## Code map
- `src/App.tsx`: login state → auth screens / Add medication wizard / tabs + reminder banner
- `src/lib/`: `supabase.ts` (client), `auth.ts` (login actions, error messages, `DEMO_ACCOUNT`), `useAuth.ts`,
  `time.ts` (Asia/Amman helpers, day parts), `doses.ts` (dose status, reminders, snooze), `useDoses.ts`
  (today's doses shared by Today + banner, ticks every second), `adherence.ts` (F8 counting), `settings.ts`
  (Demo speed), `alert.ts` (chime + vibration), `format.ts` (amount / strength text)
- `src/storage/`: `medications.ts`, `doseLogs.ts` (Supabase calls)
- `src/screens/`: `Auth/`, `AddMedication/`, `Today/`, `Progress/`, `Settings/`
- `src/components/`: `TabBar`, `ReminderBanner`, `MedicationCard`, `Autocomplete`, `LanguageSwitch`
- `src/data/drugs.ts`: ~50 medicine names (whole list REVIEW-AR)
- `src/i18n/en.json`, `ar.json`: all text, same keys; `t(key, { n })` fills `{n}` placeholders
- `src/index.css`: all styles (logical properties only); sections per feature
- `supabase/migrations/`: SQL applied to the project (keep in sync with the database)
- `scripts/seed-demo.mjs`: resets the demo account (logs in as demo; no secret key)

## Database (Supabase project `medfriend`, ref `zotspmzlyopvkqsrgrng`)
- Tables `medications` (strength as `strength_value` + `strength_unit`; old `strength` text column still exists,
  unused, owner declined dropping it) and `dose_logs` (`unique (medication_id, scheduled_at)`; statuses
  taken / skipped / snoozed / missed). RLS owner-only on both; grants to `authenticated` only.
- Supabase MCP plugin works in this environment (project scope, `.claude/settings.json`).
- Anonymous sign-ins are no longer used (can be switched off in the dashboard). Many empty anonymous users and
  throwaway test users (`medfriend-test-…@mailinator.com`) exist; delete only when the owner asks.

## Testing
- `npm test` = Playwright, headless, every test on phone (Pixel 7) and laptop. ~2.5 min, 102 tests.
- Each test signs up its own throwaway `@mailinator.com` account (`tests/helpers.ts`); Supabase refuses
  example.com / .test addresses. Sign-up/login waits up to 20 s (`AUTH_TIMEOUT`) because Supabase is slow under load.
- Time-based tests use Playwright's fake clock (`page.clock.install`, `fastForward`) with a fixed date in Nov 2026;
  `loginWithMeds()` in `tests/helpers.ts` creates an account with back-dated medicines.
- To show the owner a flow: record a headless video with Playwright (`recordVideo`) and open it for them.

## Live links (update automatically on every push to `main`)
| Link | Notes |
|---|---|
| https://sododabukhater.github.io/MedFriend_MVP/ | **Use this one.** GitHub Pages (`.github/workflows/pages.yml`, ~35 s per deploy). |
| https://medfriendmvp.vercel.app | Vercel; the owner's network blocks `*.vercel.app`. |

## Key decisions and rules
1. English is the default while building; Arabic is written for every string at the same time.
   Before the freeze: `DEFAULT_LANG = 'ar'` and one Arabic review pass.
2. Font: Noto Sans Arabic (Google Fonts). No ESLint, no router, no UI framework.
3. Dependencies: react, react-dom, vite, @vitejs/plugin-react, typescript, @types/react(-dom),
   @playwright/test (dev), @supabase/supabase-js 2.119.2. **Ask before adding any.**
4. Two builds: `npm run build` (base `/`) and `npm run build:pages` (base `/MedFriend_MVP/`).
   Use `import.meta.env.BASE_URL` for asset paths.
5. No medical advice: never suggest doses or strengths; the amount starts at 0.
6. Git identity is set repo-locally (owner's GitHub name + Gmail). Commit messages end with the Co-Authored-By line.

## Commands
```bash
npm run dev          # local preview at http://localhost:5173
npm run typecheck    # must pass
npm run build        # must pass (also: npm run build:pages)
npm test             # Playwright, headless; must pass
npm run test:report  # open the HTML report (has step-by-step traces with --trace on)
node scripts/seed-demo.mjs   # reset the demo account (6 medicines + 30 days of history)
```

## Gotchas
- Some files use CRLF line endings: string replacements in scripts must handle `\r\n` (or use the Edit tool).
- Browsers cache the old version: after a deploy, hard refresh (Ctrl+Shift+R).
- Sound in reminders works only after the first tap in the app (browser rule); vibration only on Android.
- `TZ=Asia/Amman date` does not work in Git Bash here; Amman is UTC+3.
