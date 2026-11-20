import { AuthError } from '@supabase/supabase-js'
import type { MessageKey } from '../i18n'
import { supabase } from './supabase'

// Email + password accounts (decided 20 Nov, replaces anonymous sign-in). Spec: docs/specs/AUTH.md

/** Shared demo account for the professor. Public on purpose: it holds sample data only. */
export const DEMO_ACCOUNT = { email: 'demo@medfriend.jo', password: '123456' } as const

export const MIN_PASSWORD = 8

export async function logIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
}

/** Returns true when the new account is logged in at once (email confirmation off). */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
  if (error) throw error
  return data.session !== null
}

/** Sends the reset link. The link opens the app, which then asks for a new password. */
export async function sendPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
  if (error) throw error
}

export async function setNewPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function logOut(): Promise<void> {
  // 'local': this browser only; still works when offline.
  await supabase.auth.signOut({ scope: 'local' })
}

export function looksLikeEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())
}

/** Turns a Supabase error into a plain message for the patient. */
export function authErrorKey(err: unknown): MessageKey {
  if (!(err instanceof AuthError)) return 'auth.err.generic'
  switch (err.code) {
    case 'invalid_credentials':
      return 'auth.err.wrong'
    case 'user_already_exists':
    case 'email_exists':
      return 'auth.err.exists'
    case 'weak_password':
      return 'auth.err.short'
    case 'email_address_invalid':
      return 'auth.err.email'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'auth.err.tooMany'
    case 'email_not_confirmed':
      return 'auth.err.notConfirmed'
    case 'same_password':
      return 'auth.err.samePassword'
  }
  // No answer from the server (offline, blocked): status 0 or a fetch error.
  if (err.status === 0 || err.name === 'AuthRetryableFetchError') return 'db.unreachable'
  return 'auth.err.generic'
}
