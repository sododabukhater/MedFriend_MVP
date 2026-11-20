# F12 — Language switch (English default during build)

## Decision (20 Nov 2026)
English is the working/default language during the build; Arabic is written for every feature
at the same time and kept in sync. Before code freeze the default becomes Arabic
(`DEFAULT_LANG = 'ar'` in `src/i18n/index.tsx`) followed by one Arabic review pass.

## Behaviour
- A pill button at the top of the screen shows the other language ("العربية" or "English").
- Tapping it switches all text, the page direction (LTR ↔ RTL) and the browser tab title.
- The choice is remembered on that device (localStorage key `medfriend.lang`).

## Acceptance criteria
1. First visit opens in English, left-to-right; the switch reads "العربية".
2. Tapping "العربية" shows the Arabic screen right-to-left; the switch moves to the other side and reads "English".
3. After a page refresh, the last chosen language is still shown.
4. The switch is at least 48px tall; no horizontal scrolling in either language.
5. `npm run typecheck` and `npm run build` pass.
