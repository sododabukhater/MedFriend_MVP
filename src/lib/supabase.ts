import { createClient } from '@supabase/supabase-js'

// Plan: docs/specs/DB-supabase.md. Only the publishable key is used here.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env')
}

// The login session is kept in this browser's localStorage, so a refresh stays logged in.
// The same account on another device sees the same data.
export const supabase = createClient(url, key)
