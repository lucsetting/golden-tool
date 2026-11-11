import { useState } from 'react'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { formatKey, type KeyKind } from '../lib/license'
import { MODULES } from '../lib/modules'
import { Button, Input } from './ui'

const LABEL: Record<KeyKind, string> = { all: 'Everything unlocked', debts: `${MODULES.debts.name} unlocked`, goals: `${MODULES.goals.name} unlocked`, reports: `${MODULES.reports.name} unlocked` }

/** Activation code field and Activate button. Accepts any code kind and says what it unlocked. */
export default function CodeInput({ className, hint }: { className?: string; hint?: string }) {
  const [v, setV] = useState('')
  const [err, setErr] = useState<string>()
  const submit = () => {
    const kind = useStore.getState().activateKey(v)
    if (!kind) { setErr("That code doesn't look right. Check the thank-you page or your email."); return }
    setErr(undefined); setV(''); useUI.getState().showToast(LABEL[kind])
  }
  const ready = v.replace(/-/g, '').length >= 12
  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input value={v} onChange={e => { setV(formatKey(e.target.value)); setErr(undefined) }} onKeyDown={e => e.key === 'Enter' && ready && submit()}
          placeholder="GOLD-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} className="font-mono tracking-wider uppercase" aria-label="Activation code" aria-invalid={!!err} />
        <Button variant="primary" className="shrink-0" onClick={submit} disabled={!ready}>Activate</Button>
      </div>
      {err ? <p role="alert" className="text-xs text-destructive mt-2">{err}</p> : hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
    </div>
  )
}
