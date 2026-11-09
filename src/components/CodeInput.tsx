import { useState } from 'react'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { formatKey, type KeyKind } from '../lib/license'
import { MODULES } from '../lib/modules'
import { Button, Field, Input, cx } from './ui'

const LABEL: Record<KeyKind, string> = { all: 'Everything unlocked', debts: `${MODULES.debts.name} unlocked`, goals: `${MODULES.goals.name} unlocked`, reports: `${MODULES.reports.name} unlocked`, lifetime: 'Lifetime access activated' }

/** Activation code field + Unlock button. Accepts any code kind; tells the user what it unlocked. */
export default function CodeInput({ label = 'Activation code', hint, onUnlocked, className, compact }: { label?: string; hint?: string; onUnlocked?: (kind: KeyKind) => void; className?: string; compact?: boolean }) {
  const [v, setV] = useState('')
  const [err, setErr] = useState<string>()
  const activate = useStore(s => s.activateKey)
  const toast = useUI(s => s.showToast)
  const submit = () => {
    const kind = activate(v)
    if (!kind) { setErr("That code doesn't look right. Check the thank-you page or your email."); return }
    setErr(undefined); setV(''); toast(LABEL[kind]); onUnlocked?.(kind)
  }
  const field = (
    <div className="flex gap-2">
      <Input value={v} onChange={e => { setV(formatKey(e.target.value)); setErr(undefined) }} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="GOLD-XXXX-XXXX" className="font-mono tracking-wider uppercase" aria-label={label} />
      <Button variant="primary" onClick={submit} disabled={v.replace(/-/g, '').length < 12}>Activate</Button>
    </div>
  )
  if (compact) return <div className={className}>{field}{err && <p className="text-xs text-destructive mt-2">{err}</p>}</div>
  return <Field label={label} hint={hint ?? 'Your code is on the thank-you page after purchase.'} error={err} className={cx(className)}>{field}</Field>
}
