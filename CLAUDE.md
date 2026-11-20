# Med Friend — Alpha MVP (web app)

> Current status, decisions and next step: read `docs/HANDOFF.md` first.

## Product
Med Friend (صديقك الطبي) is a medication-adherence app launching in Jordan.
Alpha customer: a self-managing chronic / polypharmacy patient, 35–65, comfortable with a smartphone.
Caregiver mode, pharmacy portal and doctor portal are OUT of scope for the alpha.

Outcomes the alpha must show:
1. Patients take more of their doses on time (measured by the dose log).
2. One place for the patient's medication record.

## Deadline and audience
- Must be live on a public link, and tested by me, by Wednesday 25 Nov 2026. Code freeze Tuesday evening.
- My professor opens the link on a phone or a laptop. It must look and work like a mobile app in both:
  mobile-first layout, max width 430px; on desktop, centred in a phone-sized frame.
- Prefer the simplest working solution. If something takes more than half a day, stop and propose a simpler fallback.

## Alpha scope (build in this order; stop at the cut line if time runs out)
Foundations (apply to every screen from day 1, never retrofit):
- F12 Native Arabic RTL: `<html dir="rtl" lang="ar">`. Arabic is the source language, written natively, not translated. English is a secondary toggle.
  - Build phase (decided 20 Nov): English is the working and default language so I can review features easily. Arabic is written natively for every feature at the same time and kept in sync in `ar.json`. A language switch (العربية / English) is on screen. Before code freeze, set `DEFAULT_LANG = 'ar'` in `src/i18n/index.tsx` and do one Arabic review pass.
- F11 Simple mode: large text (min 18px body), one main action per screen, high contrast, big tap targets (min 48px).

Tier A — core loop (must ship):
- F6-lite Add medication: name (autocomplete from a curated local list of ~50 common Jordanian drug names, free-text fallback), dose, form, times per day.
- F1 Reminder with Taken / Snooze / Skip and a follow-up after 15 min if no answer.
  Web limitation: show the reminder as an in-app notification banner while the app is open.
  Add a "Demo speed" switch in settings that makes 15 minutes = 15 seconds and a "Trigger next reminder now" button, so the professor can see the full flow in a minute.
- F2 "Today" view: doses grouped by time slot (morning / noon / evening / night), status per dose.
- F8 Dose log (timestamped) + adherence % per medication for 7 and 30 days.

Tier B — Tuesday morning only, only if Tier A passes all tests; in this order:
- F9 One-tap Arabic summary (medication list + adherence): printable page (browser Print → PDF) and a WhatsApp share link with the text summary.
- F3 Prayer and meal anchors ("after Fajr", "with Iftar"). Prayer times for Amman by default.
- F10-lite Document vault: upload/photograph a lab result or prescription, tag by date and type, stored in the browser.
- F7 Stock count with low-stock refill alert.

Deferred (validate with the Kano questionnaire only, do not build): F4 own-pill photo card, F5 Arabic voice readout.

## Technical rules
- Stack: Vite + React + TypeScript, plain CSS (no UI framework unless I approve). Static site only.
- Hosting: Vercel, connected to this GitHub repo. Every push to main updates the live link; other branches get preview links.
- Backup hosting: GitHub Pages (https://sododabukhater.github.io/MedFriend_MVP/), published by `.github/workflows/pages.yml` on every push to main. Build with `npm run build:pages` (sets the `/MedFriend_MVP/` base path).
- I work in Claude Code on the web (cloud). I have no local Node.js, so I test only through the Vercel links.
- Local-first: all data stays in the visitor's browser (localStorage; IndexedDB only for document images). No backend, no accounts, no analytics, no cookies.
- First visit: show a short welcome screen with two buttons: "ابدأ" (start empty) and "جرّب ببيانات تجريبية" (load demo data: 4–5 medications and 30 days of past dose history, clearly labelled as demo). Settings has "Reset all data".
- RTL: use logical CSS properties (margin-inline-start, etc.), never left/right. All user-facing strings live in `src/i18n/ar.json` (primary) and `src/i18n/en.json`.
- Use an Arabic-friendly web font (e.g. Noto Sans Arabic / IBM Plex Sans Arabic / Cairo) loaded locally or from Google Fonts.
- Dates/times: Asia/Amman time zone.
- No medical advice: the app never suggests doses, interactions or diagnoses. It only records what the patient enters. Show a one-line disclaimer in settings.

## Working rules for Claude
- Plan before coding any feature; wait for my approval of the plan.
- One feature per commit; each feature has acceptance criteria in `docs/specs/Fx.md`.
- After each feature: run the type-check and `npm run build` (both must pass), commit and push, then tell me exactly what to click on the Vercel link to test it.
- Write Arabic copy natively; mark any string you are unsure of with `// REVIEW-AR` so I can check it.
- Ask me before adding any new dependency.
