import type { User } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  // recovery: the patient opened a "reset password" link and must choose a new password.
  | { status: 'signedIn'; user: User; recovery: boolean }

/** Follows the login state. The session is kept in localStorage, so a refresh stays logged in. */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    // Fires once at start (INITIAL_SESSION) and on every login / logout / token refresh.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState((prev) => {
        if (!session) return { status: 'signedOut' }
        const recovery =
          event === 'PASSWORD_RECOVERY' || (prev.status === 'signedIn' && prev.recovery && event !== 'USER_UPDATED')
        return { status: 'signedIn', user: session.user, recovery }
      })
      // The saved login keeps an old copy of the account details ("My details", F9). Fetch the current ones
      // once at start, so a name saved on another device shows here too.
      // (Deferred: Supabase calls inside this callback can lock up the auth client.)
      if (event === 'INITIAL_SESSION' && session) {
        setTimeout(() => {
          supabase.auth.getUser().then(({ data: fresh }) => {
            const user = fresh.user
            if (!user) return
            setState((prev) => (prev.status === 'signedIn' && prev.user.id === user.id ? { ...prev, user } : prev))
          })
        }, 0)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const finishRecovery = useCallback(() => {
    setState((prev) => (prev.status === 'signedIn' ? { ...prev, recovery: false } : prev))
  }, [])

  return { state, finishRecovery }
}
