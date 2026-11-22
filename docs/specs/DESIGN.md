# Design revamp + Reset all data (approved 22 Nov 2026, built 22 Nov)

Mock-up approved by the owner on 22 Nov (`docs/design-mockup/*.dc.html`, reference only).

## Idea
The four parts of the day each have one soft colour; that colour is the only bold thing on screen.
Everything else is quiet: white boxes, dark text, one green for actions. Font: Readex Pro (Google Fonts).

| Token | Value |
|---|---|
| Page / cards / text / muted | `#EEF3F0` / `#FFFFFF` / `#10231D` / `#4A5A53` |
| Action green (white text) / lines / Missed / focus ring | `#0A6B52` / `#E1E8E4` / `#9B1C1C` / `#F2A900` |
| Morning / Noon / Evening / Night (background / text) | `#FCEFCF`/`#5C4108`, `#DCEEF8`/`#123F5C`, `#F8DFD2`/`#6B2E14`, `#E2E1F3`/`#2A2860` |

## Screens
- **Frame:** phone-sized (max 430 px; on a laptop centred in a phone frame). The screen scrolls inside; the tab bar
  stays at the bottom. Tabs have line icons (sun, pill, bars, gear).
- **Today:** top card = the dose due now (or snoozed, or the next one), tinted with its part-of-day colour:
  big time, name + strength, amount, "I took it", and "Remind me later" (only while due) / "Skip".
  When every dose has an answer: "Every dose for today has an answer." Then "4 of 7 taken" with one segment per dose.
  Then one white box per part of the day with a coloured header. Rows: time | name + amount | status
  (tick + time when taken, "Missed" in red, "Due now", "Upcoming", "Snoozed until …", "Skipped").
  Tapping a row opens I took it / Skip (or Undo) for that dose; only one row is open at a time.
- **Reminder (F1):** a panel at the bottom over a dimmed screen, tinted by part of day: "Time for your noon
  medicine" (or the second-reminder text), "1 of 2" when several, big time, medicine, amount, "I took it",
  "Remind me in 15 minutes" (15 seconds with Demo speed), "Skip this dose". It covers the app until answered.
  "I took it" gets the keyboard focus. Save errors show inside the panel.
- **My medicines:** count under the title; one white list; each medicine: name + strength, "1 tablet, twice a day",
  time chips in part-of-day colours, Delete (with the confirm step). "Add a medicine" button fixed above the tabs.
- **Progress (F8):** switch "Last 7 days / Last 30 days"; "You took 40 of 48 doses (83%)." with one bar per day
  (7 bars with day numbers and "Today", or 30 thin bars); per-medicine rows with % and a thin bar and
  "x of y taken on time"; the dose log opens with "See every dose" (follows the switch).
- **Settings:** Language (العربية / English); For the demo: Demo speed switch + "Show the next reminder now";
  Account: email, Log out, **Reset all data**; disclaimer at the bottom.
- **Login / Add medication:** same font, colours and buttons; layout unchanged.
- Avoided: ALL-CAPS labels, coloured side borders, emoji icons, middle-dot strings on the new screens.

## Reset all data
Red outline button → "Delete all your medicines and your dose history? This cannot be undone." →
"Yes, delete everything" / "Keep my data". Deletes every `medications` row of the account (RLS-limited);
`dose_logs` rows go with them (`on delete cascade`). The shared demo account shows
"The shared demo account cannot be reset." instead of the button, so the professor's demo data stays safe.

## Acceptance criteria
1. Today's top card shows the due (or snoozed / next) dose in its part-of-day colour; its buttons save the answer.
2. Tapping a dose row opens its buttons; one open row at a time; the row shows a tick + time once taken.
3. Day-part boxes have coloured headers, no capitals; the font is Readex Pro.
4. The reminder is a bottom panel over a dimmed screen with the part-of-day colour and the new wording.
5. My medicines shows the count, "1 tablet, twice a day", coloured time chips, Add button above the tabs.
6. Progress has the 7 / 30 days switch, the sentence with %, day bars, per-medicine %, and the dose log behind a button.
7. Reset all data asks first; "Keep my data" keeps everything; "Yes" deletes medicines and dose logs.
   Not offered on the demo account.
8. Everything works in Arabic (RTL); text ≥ 18px; buttons ≥ 48px; phone and laptop.

Tests: `tests/DESIGN.spec.ts`, plus the updated `tests/F1`, `F2`, `F6`, `F8` specs. Tests that use the real time now
start with a fake clock at 03:00 Amman (`installEarlyClock` in `tests/helpers.ts`), so no reminder panel gets in the way.

## REVIEW-AR (new Arabic strings to check)
`hero.now` حان موعدها، {part} · `hero.next` الجرعة التالية، {part} · `hero.snoozed` سنذكّرك مرة أخرى الساعة {time} ·
`hero.done` سجّلت كل جرعات اليوم. · `hero.later` ذكّرني لاحقاً · `rem.title` حان موعد دواء {part} ·
`rem.skip` تخطَّ هذه الجرعة · `home.count` عدد الأدوية: {n} · `settings.demo.title` للعرض التجريبي ·
`settings.reset*` (حذف كل البيانات، نعم، احذف كل شيء، احتفظ ببياناتي) · `progress.sentence` أخذت {n} من {total} جرعة ({pct}%).
