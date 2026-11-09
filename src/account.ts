import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { KeyKind } from './lib/license'

/** A purchase recorded by the Digistore24 webhook (or granted by hand) for this email. */
export interface Entitlement { product: KeyKind; status: 'active' | 'refunded'; order_id: string | null; created_at: string }

interface AccountState {
  ready: boolean            // first auth check done
  synced: boolean           // first pull of user_state done for the current session
  setSynced: (v: boolean) => void
  session: Session | null
  entitlements: Entitlement[]
  init: () => void
  signInWithEmail: (email: string) => Promise<string | null>   // returns error message or null
  signInWithPassword: (email: string, password: string) => Promise<string | null>
  /** Sets (or changes) the password of the signed-in user and remembers that one exists. */
  setPassword: (password: string) => Promise<string | null>
  hasPassword: () => boolean
  verifyCode: (email: string, code: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshEntitlements: () => Promise<void>
}

export const useAccount = create<AccountState>()((set, get) => ({
  ready: !supabase,
  synced: !supabase,
  setSynced: synced => set({ synced }),
  session: null,
  entitlements: [],
  init: () => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { set({ session: data.session, ready: true }); if (data.session) void get().refreshEntitlements() })
    supabase.auth.onAuthStateChange((_e, session) => { set({ session, synced: session ? get().synced && get().session?.user.id === session.user.id : false }); if (session) void get().refreshEntitlements(); else set({ entitlements: [] }) })
  },
  signInWithEmail: async email => {
    if (!supabase) return 'Accounts are not configured.'
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    return error ? error.message : null
  },
  signInWithPassword: async (email, password) => {
    if (!supabase) return 'Accounts are not configured.'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  },
  setPassword: async password => {
    if (!supabase) return 'Accounts are not configured.'
    const { data, error } = await supabase.auth.updateUser({ password, data: { has_password: true } })
    if (error) return error.message
    if (data.user) set(s => (s.session ? { session: { ...s.session, user: data.user } } : {}))
    return null
  },
  hasPassword: () => !!get().session?.user.user_metadata?.has_password,
  verifyCode: async (email, code) => {
    if (!supabase) return 'Accounts are not configured.'
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    return error ? error.message : null
  },
  signOut: async () => { await supabase?.auth.signOut(); set({ session: null, entitlements: [] }) },
  refreshEntitlements: async () => {
    if (!supabase) return
    const { data } = await supabase.from('entitlements').select('product,status,order_id,created_at')
    if (data) set({ entitlements: data as Entitlement[] })
  },
}))
