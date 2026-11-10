import { supabase } from './supabase'
import { loadState, migrate, pickData, useStore, type Data } from '../store'
import { useAccount } from '../account'

let timer: ReturnType<typeof setTimeout> | undefined
let lastPushed = ''
let started = false
/** The account's copy as last read or written, with every field it carries. */
let remote: Record<string, unknown> = {}

/** What goes to the server: this device's data laid over the server's copy, so a field written by a newer version
 *  that this device does not know is sent back untouched. */
export const forServer = (serverCopy: Record<string, unknown>, local: Data) => ({ ...serverCopy, ...pickData(local) })

/**
 * One row per user holding the whole app state as JSON (ponytail: a document store, not a schema).
 * Pull on sign-in, push 800ms after any change. Last write wins.
 */
export function startSync() {
  if (!supabase || started) return
  started = true
  const sb = supabase

  const push = async () => {
    const { session, synced } = useAccount.getState()
    const user = session?.user
    if (!user || !synced) return // never push before the first pull: a fresh device must not overwrite the account
    const state = forServer(remote, useStore.getState())
    const snap = JSON.stringify(state)
    if (snap === lastPushed) return
    lastPushed = snap
    remote = state
    await sb.from('user_state').upsert({ user_id: user.id, state, updated_at: new Date().toISOString() })
  }
  const pull = async () => {
    const user = useAccount.getState().session?.user
    if (!user) return
    const { data } = await sb.from('user_state').select('state,updated_at').eq('user_id', user.id).maybeSingle()
    remote = (data?.state as Record<string, unknown> | undefined) ?? {}
    if (data?.state) {
      lastPushed = JSON.stringify(remote)
      // The same migration as stored state: a copy written by an older version gains the new lists, empty.
      loadState(pickData(migrate(remote)))
      useAccount.getState().setSynced(true)
    } else {
      useAccount.getState().setSynced(true)
      await push() // first device: seed the row with whatever is local
    }
  }

  useStore.subscribe(() => { clearTimeout(timer); timer = setTimeout(() => void push(), 800) })
  useAccount.subscribe((s, prev) => { if (s.session?.user.id && s.session.user.id !== prev.session?.user.id) void pull() })
  if (useAccount.getState().session) void pull()
}
