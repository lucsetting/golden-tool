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
export function startSync(sb = supabase) {
  if (!sb || started) return
  started = true

  /** The account's copy, or null when the account has none yet. Throws when it could not be read. */
  const read = async (userId: string) => {
    const { data, error } = await sb.from('user_state').select('state').eq('user_id', userId).maybeSingle()
    if (error) throw error
    return (data?.state as Record<string, unknown> | undefined) ?? null
  }
  const push = async () => {
    const { session, synced } = useAccount.getState()
    const user = session?.user
    if (!user || !synced) return // never push before the first pull: a fresh device must not overwrite the account
    const local = JSON.stringify(pickData(useStore.getState()))
    if (local === lastPushed) return
    lastPushed = local
    // Read the copy again first: another device may have written fields this one does not know since the pull.
    try { remote = (await read(user.id)) ?? remote } catch { /* offline: lay the data over the copy from the pull */ }
    remote = forServer(remote, JSON.parse(local))
    const { error } = await sb.from('user_state').upsert({ user_id: user.id, state: remote, updated_at: new Date().toISOString() })
    if (error) lastPushed = '' // the next change sends everything again
  }
  const pull = async () => {
    const user = useAccount.getState().session?.user
    if (!user) return
    let copy: Record<string, unknown> | null
    // A pull that fails is not an empty account: nothing is shown or sent until the copy has been read.
    try { copy = await read(user.id) } catch { setTimeout(() => void pull(), 3000); return }
    if (useAccount.getState().session?.user.id !== user.id) return
    remote = copy ?? {}
    if (copy) {
      // The same migration as stored state: a copy written by an older version gains the new lists, empty.
      const data = pickData(migrate(copy))
      lastPushed = JSON.stringify(data)
      loadState(data)
    }
    useAccount.getState().setSynced(true)
    if (!copy) await push() // first device: seed the row with whatever is local
  }

  useStore.subscribe(() => { clearTimeout(timer); timer = setTimeout(() => void push(), 800) })
  useAccount.subscribe((s, prev) => { if (s.session?.user.id && s.session.user.id !== prev.session?.user.id) void pull() })
  if (useAccount.getState().session) void pull()
}
