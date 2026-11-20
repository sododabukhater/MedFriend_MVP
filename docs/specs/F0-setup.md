# F0 — Project setup (foundations)

## Goal
An empty, working app shell that every later feature builds on: Vite + React + TypeScript,
Arabic RTL, Simple-mode styling, and the phone-frame layout. No features.

## Scope
- One home screen: app name "صديقك الطبي", a short tagline, an empty-state line,
  and one large "إضافة دواء" button (placeholder, no action yet).
- `<html dir="rtl" lang="ar">`; all strings in `src/i18n/ar.json` and `src/i18n/en.json`.
- Font: Noto Sans Arabic (Google Fonts), system font fallback.
- English toggle: NOT in this step (files and `t()` helper are ready for it).

## Acceptance criteria
1. On a phone, the live link shows the home screen full-screen, text right-aligned, no horizontal scroll.
2. On a laptop (window ≥ 600px wide), the app appears centred in a phone-shaped frame, 430px wide.
3. Body text ≥ 18px (actual: 20px); main button ≥ 48px tall (actual: 64px).
4. Contrast (WCAG): body text 17.7:1, secondary text 9.2:1, button text 7.6:1 — all ≥ 7:1 (AAA).
5. CSS uses logical properties only (no left/right).
6. `npm run typecheck` and `npm run build` both pass.
