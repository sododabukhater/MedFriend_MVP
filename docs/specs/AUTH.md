# AUTH — Email + password accounts (decided and built 20 Nov 2026)

Replaces anonymous sign-in, so the same account sees the same data on every device.

## Decisions (owner, 20 Nov)
- Email + password. Screens: Log in, Create an account, Forgot password, Choose a new password. Log out on home.
- **"Confirm email" is off** in Supabase: a new account is logged in at once.
- **Reset email: Supabase built-in email.** It only delivers to members of the owner's Supabase team,
  about 2 emails per hour. Enough to show the flow with the owner's own account.
- **Demo account button** on the login screen for the professor: `demo@medfriend.jo` / `123456`
  (created by the owner in the dashboard). Public on purpose (in `src/lib/auth.ts`); sample data only.
  Reset its 5 medicines with `node scripts/seed-demo.mjs`.
- The owner also created two personal accounts for their own testing. Never put them in code or docs.
- Anonymous sign-in is no longer used by the app.

## Supabase settings (done by the owner, 20 Nov)
- Authentication → Sign In / Providers → Email: "Confirm email" off.
- Authentication → URL Configuration: Site URL `https://sododabukhater.github.io/MedFriend_MVP/`;
  Redirect URLs `https://medfriendmvp.vercel.app/**`, `http://localhost:5173/**`.
- Authentication → Rate Limits: sign-ups and sign-ins raised (each test signs up a new account).

## Rules
- Passwords: at least 8 characters for new accounts (checked in the app; Supabase itself allows 6).
- Forgot password always shows the same message, whether or not the account exists.
- Messages are plain words (wrong password, account exists, too many tries, offline), English + Arabic.
- Tests use throwaway `@mailinator.com` addresses (Supabase refuses example.com / .test). No real email is sent.
  The forgot-password test answers the request itself instead of sending an email.

## Acceptance criteria (tests: `tests/auth.spec.ts`, `tests/home.spec.ts`, `tests/DB-supabase.spec.ts`)
1. First visit shows Log in, with Create an account, Forgot your password? and Use the demo account.
2. Create an account logs in at once; a refresh stays logged in.
3. Sign up checks the email, the 8-character minimum and that both passwords match.
4. Signing up with an existing email says the account exists.
5. Log out → log in again shows the same medicines; a wrong password is refused.
6. The same account in another browser sees the same medicines.
7. Forgot password sends a reset link back to this app and shows a neutral confirmation.
8. The reset link opens "Choose a new password"; afterwards only the new password works.
9. "Use the demo account" logs in to the demo data.
10. Logging in offline shows a clear message.
11. All login screens work in Arabic (RTL).
12. One account cannot read or change another account's rows (RLS).
