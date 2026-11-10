import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// `?? {}`: the assertion script loads this file outside the bundler, where there is no env object.
const env: Record<string, string | undefined> = import.meta.env ?? {}
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY

/** null when the env vars are missing: the app then runs local-only (no accounts, browser storage). */
export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } }) : null
export const hasAccounts = supabase !== null
