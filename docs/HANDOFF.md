# Handoff — current status (read this first)

Last updated: **Sun 22 Nov 2026, afternoon** (fifth session: F4 built).
`CLAUDE.md` is the rulebook. This file is the current state of the work. Deadline: live and tested by
**Wed 25 Nov**; **code freeze Tue 24 Nov evening**.

## ▶ Start here (new chat)
1. Everything is committed and pushed to `main`; the live link is up to date; working tree clean.
2. **Done:** Tier A (F6, F2, F1, F8 + login, Settings, Progress), **design revamp** (+ Reset all data),
   **F9** doctor summary (+ "My details" profile, A4 print with logo), **F3** prayer and meal anchors
   (+ "Prayer and Ramadan times" switch, off by default), **F4** own-pill photo (My medicines + optional step 5,
   shown in the reminder, on Today and on the card). **163 Playwright tests pass** (3 skipped by design).
3. **Next step: F5 — Arabic voice dose readout.** Explain it to the owner in plain words first (what the patient
   sees, what it does not do, time, then 2–3 multiple-choice decisions with a recommended option), then write
   `docs/specs/F5.md`, get approval, build, test, commit, push, tell the owner what to click, offer a walkthrough video.
4. Then F10 (documents; needs a Storage bucket like F4: ask before applying), F7 (stock). Cut line: if behind on **Monday evening**, drop F7 first, then F10.
5. **Tuesday:** `DEFAULT_LANG = 'ar'` in `src/i18n/index.tsx`, Arabic review pass (all REVIEW-AR lists in the specs),
   run `node scripts/seed-demo.mjs` (Tuesday evening or Wednesday morning), code freeze.

## Plan (decided by the owner on 20 Nov: build everything)
| # | Item | Estimate | Status / target | Notes |
|---|---|---|---|---|
| 1 | Design revamp + "Reset all data" | 4–5 h | ✅ Sun | `docs/specs/DESIGN.md` |
| 2 | F9 Summary for my doctor: print / PDF + WhatsApp | 2–3 h | ✅ Sun | `docs/specs/F9.md`; print redesigned after owner feedback |
| 3 | F3 Prayer and meal anchors, Amman prayer times | ~5 h | ✅ Sun | `docs/specs/F3.md` |
| 4 | F4 Own-pill photo card (photo on the medicine and in the reminder) | ~3 h | ✅ Sun | `docs/specs/F4.md`; private bucket `pill-photos` |
| 5 | **F5** Arabic voice dose readout | ~2 h | **next** (Sun/Mon) | Browser `speechSynthesis`; "Voice not available" if no Arabic voice |
| 6 | F10 Document vault (lab results / prescriptions, tag by date and type) | 3–4 h | Mon | Supabase Storage |
| 7 | F7 Stock count + low-stock refill alert | 2–3 h | Mon/Tue | First to cut |
| — | Tuesday: Arabic default + review pass, demo reset, freeze | | Tue | |

## About the owner
- Industrial engineer / innovation background, **no coding experience**. Explain in plain words, short.
- Answers best with multiple-choice questions (AskUserQuestion) with a recommended default. "explain" = re-explain simply.
- Likes to **see** results: test in their Chrome (Claude in Chrome extension, when connected) or **a headless
  walkthrough video** with captions. Offer the video after each feature.
- Skip code reviews (owner, 20 Nov). Headless Playwright tests for every change are still required.
- Owner tests on the GitHub Pages link. They may decline database actions (declined before: writing users into
  `auth.users`, dropping the old `strength` column). Always ask before a database / storage change; don't retry.
- Owner's personal accounts (Gmail, Outlook) exist in Supabase: **never put them in code or docs.**

## Done (all on `main`, all pushed)
| Commit | What | Spec | Tests |
|---|---|---|---|
| `705a12a` | F0 setup: Vite + React + TS, phone frame | `docs/specs/F0-setup.md` | |
| `7050ea6` | GitHub Pages backup hosting | | |
| `2253376` | F12 language switch (English default during build) | `docs/specs/F12-language-switch.md` | `tests/home.spec.ts` |
| `ee1aa1a` | Supabase DB (tables, RLS) + Playwright setup | `docs/specs/DB-supabase.md` | `tests/DB-supabase.spec.ts` |
| `d6f115e` | F6 Add medication (4 steps, name suggestions, delete + confirm) | `docs/specs/F6.md` | `tests/F6.spec.ts` |
| `e5b87e0` | Email + password login, sign-up, forgot password, demo account | `docs/specs/AUTH.md` | `tests/auth.spec.ts` |
| `1a385e8` | F6 strength = number + unit | `docs/specs/F6.md` | `tests/F6.spec.ts` |
| `586b5df` | F2 Today view | `docs/specs/F2.md` | `tests/F2.spec.ts` |
| `e989e89` | F1 Reminders + Settings with Demo speed | `docs/specs/F1.md` | `tests/F1.spec.ts` |
| `622a0d2` | F8 Progress: adherence % 7/30 days, dose log | `docs/specs/F8.md` | `tests/F8.spec.ts` |
| `569647d` | Design revamp of all screens + Reset all data | `docs/specs/DESIGN.md` | `tests/DESIGN.spec.ts` |
| `cc62452` | F9 Summary for my doctor + My details (name, year of birth) | `docs/specs/F9.md` | `tests/F9.spec.ts` |
| `c1701b0` | Refresh account details at app start (name saved on another device shows) | `docs/specs/F9.md` | `tests/F9.spec.ts` 1b |
| `afad07c` | F9 print redesign: A4 document, Med Friend logo top right | `docs/specs/F9.md` | `tests/F9.spec.ts` 4 |
| `6c25c91` | F3 Prayer and meal anchors + prayer switch (off by default) + meal times | `docs/specs/F3.md` | `tests/F3.spec.ts` |
| (F4 commit) | F4 Own-pill photo: My medicines + Add medication step 5; reminder, Today, card | `docs/specs/F4.md` | `tests/F4.spec.ts` |

## How the app works now
- **Login first** (email + password, Supabase Auth; "Confirm email" OFF). No welcome screen (owner, 20 Nov);
  the login screen's **Use the demo account** button opens the shared demo data.
- **Demo account:** `demo@medfriend.jo` / `123456` (public on purpose). 6 medicines incl. Singulair at 23:30
  (so "Show the next reminder now" works until 23:30), 30 days of history, name "مريض تجريبي (Demo patient)",
  born 1968, **prayer times ON**, default meal times. Reset with `node scripts/seed-demo.mjs` (also gives Nexium
  "before breakfast" = 07:30). **Run it Tuesday evening / Wednesday morning**: the history is fixed, so days after the
  last reset count as Missed (on 22 Nov the 7-day figure is low for this reason). "Reset all data" is not offered on
  the demo account. If someone answers a demo dose, tap the row → Undo.
- **4 tabs:** Today | My medicines | Progress | Settings. Opens on Today.
  - **Today:** top card = dose due now / snoozed / next (part-of-day colour); "x of y taken"; one box per part of day;
    tap a row → I took it / Skip / Undo. Anchored doses show their moment ("After Fajr").
  - **Reminder:** bottom panel over a dimmed screen; blocks the app until answered (I took it / Remind me in 15 minutes /
    Skip this dose); names the moment for anchored doses.
  - **My medicines:** list with coloured time chips ("08:00" or "After Fajr"); photo area (Add a photo / Change /
    Remove); fixed "Add a medicine". Add medication has 5 steps (step 5 = optional photo, "Skip for now").
  - **Progress:** 7 / 30 days switch, sentence with %, day bars, per-medicine %, "Summary for my doctor", "See every dose".
  - **Summary for my doctor (F9):** document with logo top right; asks for the name on the page if none saved;
    "Print or save as PDF" (one A4 page, own margins, no browser header) and "Send on WhatsApp" (`wa.me` text).
  - **Settings:** My details (name, year of birth) · My day (Prayer and Ramadan times switch, today's Amman prayer
    times when on, My meal times) · Language · For the demo (Demo speed, Show the next reminder now) · Account
    (Log out, Reset all data) · disclaimer.
- **Rules:** "Due now" from the dose time until +60 min, then "Missed". Doses before a medicine was added never count.
  Follow-up / snooze 15 min. Demo speed (per device): 1 minute = 1 second. Adherence = Taken ÷ decided doses.
- **F3 anchors:** after a prayer = prayer time + 15 min; before / with / after a meal = −30 / 0 / +30 min; Suhoor =
  Fajr − 45 min; Iftar = Maghrib. Prayer times calculated in-app (Jordan Ministry of Awqaf: Fajr/Isha 18°,
  Maghrib = sunset + 5 min), matched the official timetable to the minute. Known limit: changing a meal time also moves
  past anchored doses, so an old answer may show as Missed.
- **F4 photos:** shrunk in the browser (800 px JPEG), private bucket `pill-photos`, path `<user id>/<med id>-<time>.jpg`,
  `medications.photo_path`; shown via 1-day signed links made when the list loads. Deleting a medicine / Reset all data
  deletes the files; `seed-demo.mjs` clears demo photos. Demo medicines have no photos.
- **Account metadata** (Supabase Auth `user_metadata`, no tables): `full_name`, `birth_year`, `prayer_times`, `meal_times`.

## Code map
- `src/App.tsx`: login state → auth screens / Add medication / Summary / tabs + reminder panel; `PrefsProvider`.
- `src/lib/`: `supabase.ts`, `auth.ts` (`DEMO_ACCOUNT`), `useAuth.ts` (refreshes account details at start),
  `time.ts` (Amman helpers, day parts), `doses.ts`, `useDoses.ts`, `adherence.ts`, `useHistory.ts` (30-day history for
  Progress + Summary), `settings.ts` (Demo speed), `alert.ts`, `format.ts`, `profile.ts` (My details),
  `summary.ts` (F9 data + WhatsApp text), `prayer.ts` (F3 prayer times), `anchors.ts` (F3 anchors, meal / prayer prefs),
  `prefs.tsx` (prefs context).
- `src/storage/`: `medications.ts` (incl. `anchors`, `photoPath`/`photoUrl`, `deleteAllMedications`), `doseLogs.ts`,
  `photos.ts` (F4).
- `src/screens/`: `Auth/`, `AddMedication/`, `Today/`, `Medicines/`, `Progress/`, `Summary/`, `Settings/`.
- `src/components/`: `TabBar`, `ReminderBanner` (bottom panel), `MedicationCard`, `Autocomplete`, `LanguageSwitch`,
  `ScreenHeader`, `Icons`, `Logo` (brand mark), `ProfileForm`, `DoseTimeRow` (F3 picker), `DaySettings` (F3 settings), `PhotoPicker` (F4).
- `src/i18n/en.json`, `ar.json`: all text, same keys. `src/index.css`: all styles, tokens at the top, print styles in F9.
- `public/icon.svg`: the Med Friend logo (from the owner's deck "Med Friend - 17 Screens", slide S-P-01).
- `supabase/migrations/`: SQL applied to the project. `scripts/seed-demo.mjs`: demo reset.

## Database (Supabase project `medfriend`, ref `zotspmzlyopvkqsrgrng`)
- `medications` (strength_value + strength_unit; unused old `strength` column kept; **`anchors text[]`** added 22 Nov,
  one per dose, '' = clock time, check on allowed codes; **`photo_path`** added 22 Nov for F4) and `dose_logs` (`unique (medication_id, scheduled_at)`;
  delete cascades from medications). RLS owner-only on both.
- Supabase MCP plugin works here (`apply_migration`, `execute_sql`). Many throwaway test users
  (`medfriend-test-…@mailinator.com`) exist; delete only when the owner asks.

## Testing
- `npm test` = Playwright, headless, phone (Pixel 7) + laptop. ~2.7 min, 145 pass, 3 skipped (run-once checks).
- Each test creates its own `@mailinator.com` account. Time-based tests use a fake clock (Nov 2026);
  `loginWithMeds()` (supports `anchors`) and `installEarlyClock()` (03:00 Amman, so no reminder panel gets in the way)
  in `tests/helpers.ts`. Tests can import pure files from `src/lib` (e.g. `tests/F3.spec.ts` imports `prayer.ts`).
- Spec files: `DESIGN`, `F1`, `F2`, `F3`, `F4`, `F6`, `F8`, `F9`, `auth`, `home`, `DB-supabase`.
- Tests that walk through Add medication must tap "Skip for now" (step 5) before the review screen.
- Test images are drawn in the page (canvas) — no image files; no `@types/node`, so tests reach `Buffer` via `globalThis`.

## Showing the owner
- **Video:** write a temporary `tests/zz-video.spec.ts` (viewport 412×860, `video: { mode: 'on' }`, a caption overlay
  injected with `page.evaluate`, `page.video().saveAs(...)` into the scratchpad), run with `--project=laptop`, delete the
  spec, open the `.webm` with `cmd //c start "" <path>`. Use a throwaway account (`loginWithMeds`), never the demo.
- **PDF check:** `page.pdf({ format: 'A4', preferCSSPageSize: true })` in a temporary spec; open with `start`.
- **Chrome:** if the owner connects Claude in Chrome (`/chrome`), test on the live link in a new tab; don't press
  Print (blocks the extension). On the shared demo account, undo anything you change.

## Live links (update automatically on every push to `main`)
| Link | Notes |
|---|---|
| https://sododabukhater.github.io/MedFriend_MVP/ | **Use this one.** GitHub Pages (~35–60 s per deploy). |
| https://medfriendmvp.vercel.app | Vercel; the owner's network blocks `*.vercel.app`. |

## Key decisions and rules
1. English default while building; Arabic written for every string. Before freeze: `DEFAULT_LANG = 'ar'` + review.
   JSON can't hold `// REVIEW-AR`, so uncertain Arabic is listed under "REVIEW-AR" in each spec
   (`DESIGN.md`, `F9.md`, `F3.md`, `F4.md`, `F6.md`) and `src/data/drugs.ts`.
2. Font Readex Pro. Colours: page `#EEF3F0`, action green `#0A6B52`, brand teal `#1A6B5A` (logo), day-part tints.
   No ESLint, no router, no UI framework. Logical CSS properties only (the summary logo uses `order` to stay top right).
3. Dependencies unchanged: react, react-dom, vite, @vitejs/plugin-react, typescript, @types/react(-dom),
   @playwright/test (dev), @supabase/supabase-js 2.119.2. **Ask before adding any.**
4. Two builds: `npm run build` and `npm run build:pages` (base `/MedFriend_MVP/`).
5. No medical advice: never suggest doses, strengths or anchors.
6. Commit messages end with the Co-Authored-By line. One feature per commit.

## Commands
```bash
npm run dev          # local preview at http://localhost:5173
npm run typecheck    # must pass
npm run build        # must pass (also: npm run build:pages)
npm test             # Playwright, headless; must pass
node scripts/seed-demo.mjs   # reset the demo account (Tuesday evening / Wednesday morning)
```

## Gotchas
- **The Bash tool halves backslashes** in inline scripts / heredocs (`\d` → `d`, `\\s` → `s`). For code with regexes,
  use the Edit / Write tools (or `String.raw` in a script file written with Write).
- Some files use CRLF line endings; script replacements must handle `\r\n` (or use the Edit tool).
- No Python on this machine; for image work use Node + the project's Playwright (`require(path to node_modules/@playwright/test)`).
- Browsers cache the old version: after a deploy, hard refresh (Ctrl+Shift+R).
- A browser tab logged in before account details changed keeps an old copy until the app reloads (fixed at start-up).
- Sound in reminders works only after the first tap (browser rule); vibration only on Android.
- `TZ=Asia/Amman date` does not work in Git Bash; Amman is UTC+3 all year.
