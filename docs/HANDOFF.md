# Handoff — current status (read this first)

Last updated: **Sun 22 Nov 2026, late evening** (seventh session: F7 stock count built). All planned features are built. `CLAUDE.md` is the rulebook. This file is the current state of the work. Deadline: live and
tested by **Wed 25 Nov**; **code freeze Tue 24 Nov evening**.

## ▶ Start here (new chat)
1. Everything is committed and pushed to `main` (last feature commit: F7 stock count); the live link is up to date;
   working tree clean.
2. **Done:** Tier A (F6, F2, F1, F8 + login, Settings, Progress), **design revamp** (+ Reset all data),
   **F9** doctor summary (+ "My details" profile, A4 print with logo), **F3** prayer and meal anchors
   (+ "Prayer and Ramadan times" switch, off by default), **F4** own-pill photo (My medicines + optional step 5,
   shown in the reminder, on Today and on the card), **F5** voice readout (automatic + 🔊 button, app language,
   Settings switch; Arabic readout tuned with owner listening, see "F5 voice" below), **F10** document vault
   (Medicines | Documents switch in My medicines; photo or PDF, type, date, optional name; `docs/specs/F10.md`),
   **F7** stock count (box set in Add medication step 5, counted down from taken doses, Low at 7 days or less,
   refill card on Today; `docs/specs/F7.md`). **225 Playwright tests + 3 skipped by design.** `retries: 1` in `playwright.config.ts` (owner approved 22 Nov),
   so Supabase login timeouts show as "flaky", not failed.
3. **Open questions for the owner:**
   - **F5 Edge check** of the last two fixes (name in English, strength number in Arabic) — owner said "sounds great"
     after the first; the number fix (`c5d679b`) is not yet confirmed by ear.
   - **Demo reset** done 22 Nov evening with the owner's OK (sample documents + fresh history). Run it again
     Tuesday evening / Wednesday morning as planned.
   - F10 feedback after the owner clicks through it (walkthrough video already sent).
   - F7 feedback. **Demo account has no boxes yet**: `seed-demo.mjs` now adds them (Concor low, 5 left), but it was
     not run after F7 (it resets the shared demo history; ask first). Until then demo cards show "Set the box size".
4. **Next step: Tuesday tasks below** (all features done). Before that: owner feedback / fixes only.
5. New tables need `grant select, insert, update, delete … to authenticated` (forgot it once for F10).
6. **Tuesday:** `DEFAULT_LANG = 'ar'` in `src/i18n/index.tsx`, Arabic review pass (all REVIEW-AR lists in the specs
   and `src/lib/spokenArabic.ts`), run `node scripts/seed-demo.mjs` (Tuesday evening or Wednesday morning), freeze.

## Plan (decided by the owner on 20 Nov: build everything)
| # | Item | Estimate | Status / target | Notes |
|---|---|---|---|---|
| 1 | Design revamp + "Reset all data" | 4–5 h | ✅ Sun | `docs/specs/DESIGN.md` |
| 2 | F9 Summary for my doctor: print / PDF + WhatsApp | 2–3 h | ✅ Sun | `docs/specs/F9.md`; print redesigned after owner feedback |
| 3 | F3 Prayer and meal anchors, Amman prayer times | ~5 h | ✅ Sun | `docs/specs/F3.md` |
| 4 | F4 Own-pill photo card (photo on the medicine and in the reminder) | ~3 h | ✅ Sun | `docs/specs/F4.md`; private bucket `pill-photos` |
| 5 | F5 Arabic voice dose readout | ~2 h | ✅ Sun | Browser `speechSynthesis`; "Voice not available" if no Arabic voice |
| 6 | F10 Document vault (lab results / prescriptions, tag by date and type) | 3–4 h | ✅ Sun | `docs/specs/F10.md`; table + private bucket `documents` |
| 7 | F7 Stock count + low-stock refill alert | 2–3 h | ✅ Sun | `docs/specs/F7.md`; 3 columns on `medications` |
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
| `b93c8d5` | F4 Own-pill photo: My medicines + Add medication step 5; reminder, Today, card | `docs/specs/F4.md` | `tests/F4.spec.ts` |
| `1393322` | F5 Voice readout: automatic + 🔊 in reminder and Today top card; Settings → Reminders switch | `docs/specs/F5.md` | `tests/F5.spec.ts` |
| `df6685c` | F5 Arabic spoken amounts (حبة واحدة, not واحد حبة) + units as English words | `docs/specs/F5.md` | `tests/F5.spec.ts` 8 |
| `007569d` | F5 names from the list said in English; full case endings (حبّةٌ واحدةٌ) | `docs/specs/F5.md` | `tests/F5.spec.ts` 2, 8 |
| `9fb9bc2` | F5 English name said by the English voice inside the Arabic readout | `docs/specs/F5.md` | `tests/F5.spec.ts` 2, 2b, 2c |
| `5e3d09c` | F5 Edge: parts spoken one at a time; English voice of the same kind (online Natural) as the Arabic one | `docs/specs/F5.md` | `tests/F5.spec.ts` 2d, 2e |
| `c5d679b` | F5 only the name is English; the strength number is said by the Arabic voice | `docs/specs/F5.md` | `tests/F5.spec.ts` 2, 2b |
| `f64177b` | F10 Document vault (Medicines | Documents switch, photo/PDF, type, date, name; open, delete) | `docs/specs/F10.md` | `tests/F10.spec.ts` |
| (F7 commit) | F7 Stock count: box step in Add medication, card stock line + Low / Out of stock, new box, correct the count, Today refill card | `docs/specs/F7.md` | `tests/F7.spec.ts` |

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
    Remove); stock line "40 tablets left · about 20 days" with I got a new box / Correct the count (F7); fixed
    "Add a medicine". Add medication has 6 steps (5 = optional box, 6 = optional photo, both "Skip for now").
  - **Progress:** 7 / 30 days switch, sentence with %, day bars, per-medicine %, "Summary for my doctor", "See every dose".
  - **Summary for my doctor (F9):** document with logo top right; asks for the name on the page if none saved;
    "Print or save as PDF" (one A4 page, own margins, no browser header) and "Send on WhatsApp" (`wa.me` text).
  - **Settings:** My details (name, year of birth) · My day (Prayer and Ramadan times switch, today's Amman prayer
    times when on, My meal times) · Language · Reminders (Read reminders aloud) · For the demo (Demo speed, Show the next reminder now) · Account
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
- **F5 voice:** browser `speechSynthesis`, voice language = app language; reads name + strength, amount, moment
  ("with lunch"); follow-up adds "Reminder: this dose is not recorded yet." Read automatically 0.7 s after the
  chime (only after the first tap: browser rule), and on 🔊 (reminder panel + Today top card). "Read reminders aloud"
  is per device (localStorage `medfriend.readAloud`, on by default). Rate 0.9.
  - **Arabic readout is spoken in parts** (`SpeechPart[]` from `doseSpeech` in `src/lib/speech.ts`):
    Arabic voice «حان وقت دوائك:» → **English voice** "Glucophage" → Arabic voice «850 milligram، حبّةٌ واحدةٌ، مع الغداء.»
    Parts are spoken one after another (next on `onend`, safety timer); in Edge the English voice is an online
    "Natural" one like the Arabic voice (Edge mixed up local + online voices in one queue).
    Names from the suggestion list are said by their English box name even when saved in Arabic (`spokenName`).
    A name typed in Arabic stays in one Arabic sentence (strength then as "5 milligram"). No English voice on the
    device → the Arabic voice says every part.
  - Spoken Arabic amounts are not the screen text: `src/lib/spokenArabic.ts` has full, correct case endings
    (حبّةٌ واحدةٌ، حبّتانِ، نصفُ حبّةٍ، حبّةٌ ونصفٌ، ثلاثُ حبّاتٍ، 12 حبّةً). Owner rule: either no diacritics at all, or
    correct ones (the voice guessed «حبةٍ» wrongly). English speech spells units ("81 milligrams").
  - Owner listens on the **laptop in Edge** (Edge has online natural Arabic voices). This Windows laptop has only
    English voices installed (David, Mark, Zira), so **Chrome** on it shows "Voice not available" in Arabic.
    Phones normally have an Arabic voice.
- **F7 stock:** `medications.pack_size`, `stock_count`, `stock_set_at`. Left = stock_count − amount × taken doses
  recorded after stock_set_at (nothing subtracted in the DB, so Undo just works). Low = 7 days or less; Today shows a
  yellow refill card per low / out medicine (tap → My medicines).
- **Account metadata** (Supabase Auth `user_metadata`, no tables): `full_name`, `birth_year`, `prayer_times`, `meal_times`.

## Code map
- `src/App.tsx`: login state → auth screens / Add medication / Summary / tabs + reminder panel; `PrefsProvider`.
- `src/lib/`: `supabase.ts`, `auth.ts` (`DEMO_ACCOUNT`), `useAuth.ts` (refreshes account details at start),
  `time.ts` (Amman helpers, day parts), `doses.ts`, `useDoses.ts`, `adherence.ts`, `useHistory.ts` (30-day history for
  Progress + Summary), `settings.ts` (Demo speed), `alert.ts` (chime), `speech.ts` + `spokenArabic.ts` (F5), `format.ts`, `profile.ts` (My details),
  `summary.ts` (F9 data + WhatsApp text), `prayer.ts` (F3 prayer times), `anchors.ts` (F3 anchors, meal / prayer prefs),
  `prefs.tsx` (prefs context).
- `src/storage/`: `medications.ts` (incl. `anchors`, `photoPath`/`photoUrl`, `deleteAllMedications`), `doseLogs.ts`,
  `photos.ts` (F4), `documents.ts` (F10).
- `src/screens/`: `Documents/` (F10, shown inside My medicines), `Auth/`, `AddMedication/`, `Today/`, `Medicines/`, `Progress/`, `Summary/`, `Settings/`.
- `src/components/`: `TabBar`, `ReminderBanner` (bottom panel), `MedicationCard`, `Autocomplete`, `LanguageSwitch`,
  `ScreenHeader`, `Icons`, `Logo` (brand mark), `ProfileForm`, `DoseTimeRow` (F3 picker), `DaySettings` (F3 settings), `PhotoPicker` (F4), `ReadAloudButton` (F5).
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
- `npm test` = Playwright, headless, phone (Pixel 7) + laptop. ~3.5 min, 180 tests + 3 skipped (run-once checks).
  Full runs often show 1–2 login timeouts (test server under load); re-run that file: `npx playwright test tests/F5.spec.ts`.
- Each test creates its own `@mailinator.com` account. Time-based tests use a fake clock (Nov 2026);
  `loginWithMeds()` (supports `anchors`) and `installEarlyClock()` (03:00 Amman, so no reminder panel gets in the way)
  in `tests/helpers.ts`. Tests can import pure files from `src/lib` (e.g. `tests/F3.spec.ts` imports `prayer.ts`).
- Spec files: `DESIGN`, `F1`, `F2`, `F3`, `F4`, `F5`, `F6`, `F7`, `F8`, `F9`, `F10`, `auth`, `home`, `DB-supabase`.
- Tests that walk through Add medication must tap "Skip for now" twice (box step 5, photo step 6) before the review.
  `loginWithMeds` takes `form`, `amount` and `stock: { pack, count, setAt }`.
- Test images are drawn in the page (canvas) — no image files; no `@types/node`, so tests reach `Buffer` via `globalThis`.
- F5 tests replace `window.speechSynthesis` with a recorder (`addInitScript` in `tests/F5.spec.ts`); each spoken part
  is recorded as `{ text, lang, voice }`. Pure helpers (`spokenArabic.ts`) are tested directly (test 8).

## Showing the owner
- **Video:** write a temporary `tests/zz-video.spec.ts` (viewport 412×860, `video: { mode: 'on' }`, a caption overlay
  injected with `page.evaluate`, `page.video().saveAs(...)` into the scratchpad), run with `--project=laptop`, delete the
  spec, open the `.webm` with `cmd //c start "" <path>`. Use a throwaway account (`loginWithMeds`), never the demo.
  Write the video spec with the **Write tool** (a long bash heredoc failed to parse). Videos have no sound: for F5 a
  fake `speechSynthesis` showed the spoken words in a yellow 🔊 bubble. Choose times so no other dose becomes due
  mid-video (a new medicine gets the suggested 08:00 time, which once popped a reminder).
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
   (`DESIGN.md`, `F9.md`, `F3.md`, `F4.md`, `F5.md`, `F6.md`, `F7.md`, `F10.md`) and `src/data/drugs.ts`.
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
