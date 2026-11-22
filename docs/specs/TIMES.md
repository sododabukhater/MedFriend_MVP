# Change times without changing the history

Decided by the owner on 22 Nov 2026: "If we change the meal time or any time, it should not affect the history,
because a lot of medications change their timing through the patient's monitoring with the doctor."

## What the patient sees
- **My medicines:** each card has a **Change times** link. It opens "New times for Concor" with the same picker as
  Add medication step 4 (how many times a day; clock time or a moment in the day). Nothing else changes.
  "Save new times" stays off until something changes; two doses at the same time are refused (as in F6).
- After saving: "New times saved. They start tomorrow." The card shows the new times and, until tomorrow,
  "New times start tomorrow."
- **Settings → My meal times:** "Meal times saved. The new times start tomorrow; today stays as it was."

## Rules (owner chose "tomorrow")
- New times (medicine or meal) start **tomorrow**. Today and every earlier day keep the times they had, so
  every answer already given keeps matching its dose: Today, reminders, Progress, the doctor summary and the
  pill count do not change for past days.
- Several changes on one day: today keeps the times it started with; the last change applies from tomorrow.
- The doctor summary lists the current times (what the patient takes now).

## Data
- `medications.past_schedules jsonb` (default `[]`, migration `20261123200000_past_schedules.sql`, owner approved
  22 Nov): `[{ until: "YYYY-MM-DD", times, anchors }]`, oldest first; `until` = the last Amman date it applied.
- Meal times: account metadata `meal_times_past: [{ until, meals }]` (no database change).
- One place works out a dose's time for a date: `doseTimesOn` in `src/lib/anchors.ts` (uses `scheduleOn` and
  `mealsOn`). The card uses `currentDoseTimes`.

## Acceptance criteria (Playwright, headless, phone + laptop) — `tests/TIMES.spec.ts`
1. Change 08:00 → 09:00: card shows 09:00 + "New times start tomorrow."; Today keeps 08:00 (taken); Progress
   still 3 of 3 (100%); the next day the dose is at 09:00 and earlier days stay taken (3 of 4).
2. Once a day → twice a day starts tomorrow; Cancel saves nothing; same time twice is refused.
3. Breakfast 08:00 → 09:00 → 10:00 on the same day: today keeps 07:30 "before breakfast"; tomorrow 09:30;
   the history stays (also after a reload).
4. Arabic, right to left; buttons ≥ 48 px.

## REVIEW-AR
تغيير المواعيد · تغيير مواعيد {name} · المواعيد الجديدة لدواء {name} ·
الجرعات التي سجّلتها تبقى كما هي. تبدأ المواعيد الجديدة من الغد. · احفظ المواعيد الجديدة · جارٍ الحفظ… ·
تم حفظ المواعيد الجديدة. تبدأ من الغد. · تبدأ المواعيد الجديدة من الغد. ·
تم حفظ مواعيد الوجبات. تبدأ المواعيد الجديدة من الغد، ويبقى اليوم كما هو.

## Out of scope
Changing the name, strength, form or amount of a saved medicine (delete and add again still erases its history).
