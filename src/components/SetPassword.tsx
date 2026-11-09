import { useState } from 'react'
import { useAccount } from '../account'
import { useUI } from '../ui-state'
import { Button, Dialog, Field, Input } from './ui'

/** Create or change the account password. `required` = first-time prompt (shows "Later"). */
export default function SetPassword({ open, onClose, first }: { open: boolean; onClose: () => void; first?: boolean }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const save = async () => {
    if (pw.length < 8) return setError('Use at least 8 characters.')
    if (pw !== pw2) return setError("The two passwords don't match.")
    setBusy(true); setError(undefined)
    const err = await useAccount.getState().setPassword(pw)
    setBusy(false)
    if (err) return setError(err)
    useUI.getState().showToast(first ? 'Password created' : 'Password changed')
    setPw(''); setPw2(''); onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} width={420}
      title={first ? 'Create a password' : 'Change password'}
      description={first ? 'Next time, sign in with your email and this password. No more codes.' : 'At least 8 characters.'}>
      <form onSubmit={e => { e.preventDefault(); if (!busy) void save() }} className="space-y-5">
        <Field label="New password"><Input type="password" autoFocus autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></Field>
        <Field label="Repeat it" error={error}><Input type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} /></Field>
        <div className="flex items-center justify-between pt-1">
          {first ? <Button type="button" variant="ghost" onClick={onClose}>Later</Button> : <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>}
          <Button type="submit" variant="primary" disabled={busy || !pw || !pw2}>{busy ? 'Saving…' : 'Save password'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
