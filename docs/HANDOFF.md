# Handoff — current status (read this first)

Last updated: Fri 20 Nov 2026, end of the cloud session.
`CLAUDE.md` is the rulebook. This file is the current state of the work.

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
   @vitejs/plugin-react, typescript, @types/react, @types/react-dom. Ask before adding any.
4. **Two build modes:** `npm run build` (Vercel, base `/`) and `npm run build:pages`
   (GitHub Pages, base `/MedFriend_MVP/`). Set in `vite.config.ts`. Use `import.meta.env.BASE_URL`
   for any asset path in code; never hard-code `/`.

## Code map
- `src/main.tsx`: entry point, wraps the app in `I18nProvider`
- `src/App.tsx`: home screen (title, tagline, empty state, "Add medication" button that does nothing yet)
- `src/i18n/index.tsx`: `useI18n()` gives `{ lang, setLang, t }`; language saved in localStorage `medfriend.lang`
- `src/i18n/en.json`, `src/i18n/ar.json`: all user-facing text (same keys in both)
- `src/components/LanguageSwitch.tsx`: the "العربية / English" pill
- `src/index.css`: design tokens (colours, 20px body text, 48px minimum tap size), phone frame. Logical CSS properties only.

## Next step: F6-lite "Add medication" (plan written, NOT yet approved)
Full plan: `docs/specs/F6.md`. Waiting for the owner's answers to open decisions A–D in that file.
Do not start coding until the owner approves.

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
```
Needs Node.js 20.19 or newer (Vite 8). TypeScript is version 7.

## Gotchas found so far
- The cloud session could push only after the owner connected GitHub to Claude (claude.ai/connect-github).
- Browsers cache the old version: after a deploy, hard refresh (Ctrl+Shift+R) if a change does not show.
