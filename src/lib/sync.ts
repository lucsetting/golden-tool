import { supabase } from './supabase'
import { useStore, type State } from '../store'
import { useAccount } from '../account'

const FIELDS = ['settings', 'categories', 'expenses', 'recurring', 'goals', 'debts', 'recurringApplied'] as const
type Snapshot = Pick<State, (typeof FIELDS)[number]>
const pick = (s: State): Snapshot => Object.fromEntries(FIELDS.map(f => [f, s[f]])) as Snapshot

let timer: ReturnType<typeof setTimeout> | undefined
let lastPushed = ''
let started = false

/**
 * One row per user holding the whole app state as JSON (ponytail: a document store, not a schema).
 * Pull on sign-in (remote wins when it is newer), push 800ms after any change. Last write wins.
 */
export function startSync() {
  if (!supabase || started) return
  started = true
  const sb = supabase

  const push = async () => {
    const { session, synced } = useAccount.getState()
    const user = session?.user
    if (!user || !synced) return // never push before the first pull: a fresh device must not overwrite the account
    const snap = JSON.stringify(pick(useStore.getState()))
    if (snap === lastPushed) return
    lastPushed = snap
    await sb.from('user_state').upsert({ user_id: user.id, state: JSON.parse(snap), updated_at: new Date().toISOString() })
  }
  const pull = async () => {
    const user = useAccount.getState().session?.user
    if (!user) return
    const { data } = await sb.from('user_state').select('state,updated_at').eq('user_id', user.id).maybeSingle()
    if (data?.state) {
      const remote = data.state as Snapshot
      lastPushed = JSON.stringify(remote)
      useStore.setState(remote)
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
