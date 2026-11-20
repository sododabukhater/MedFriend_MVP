import { useCallback, useEffect, useState } from 'react'
import { ensureSession } from './supabase'

export type SessionState =
  | { status: 'loading' }
  | { status: 'ready'; userId: string }
  | { status: 'error' }

/** Starts the anonymous session on app start and reports whether the database is reachable. */
export function useSession() {
  const [state, setState] = useState<SessionState>({ status: 'loading' })

  const start = useCallback(() => {
    setState({ status: 'loading' })
    ensureSession().then(
      (userId) => setState({ status: 'ready', userId }),
      (err: unknown) => {
        console.error('Supabase session failed', err)
        setState({ status: 'error' })
      },
    )
  }, [])

  useEffect(start, [start])

  return { state, retry: start }
}
