import { createClient } from '@supabase/supabase-js'

// Plan: docs/specs/DB-supabase.md. Only the publishable key is used here.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env')
}

// The session is kept in this browser's localStorage, so each browser is its own user.
export const supabase = createClient(url, key)

let pending: Promise<string> | null = null

/**
 * Makes sure this browser has a Supabase user and returns its id.
 * First visit: signs in anonymously (no screen, no click). Later visits: reuses the saved session.
 * Shared promise, so React StrictMode's double start does not create two users.
 */
export function ensureSession(): Promise<string> {
  if (!pending) {
    pending = (async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) return data.session.user.id
      const { data: signIn, error } = await supabase.auth.signInAnonymously()
      if (error || !signIn.user) throw error ?? new Error('Anonymous sign-in returned no user')
      return signIn.user.id
    })()
    // Allow "Try again" after a failure (for example when offline).
    pending.catch(() => {
      pending = null
    })
  }
  return pending
}
