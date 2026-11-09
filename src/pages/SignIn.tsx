import { useState } from 'react'
import { useAccount } from '../account'
import { useUI } from '../ui-state'
import { Button, Card, Field, Input } from '../components/ui'
import { GoldMark } from './Onboarding'

type Mode = 'password' | 'code' | 'sent'

/**
 * Sign in with email + password. First time (or no password yet): a one-time code by email,
 * after which the app asks the person to create a password (SetPassword dialog).
 */
export default function SignIn() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const acct = useAccount.getState

  const withPassword = async () => {
    setBusy(true); setError(undefined)
    const err = await acct().signInWithPassword(email.trim(), password)
    setBusy(false)
    if (err) setError(/invalid/i.test(err) ? 'Wrong password, or no password yet. You can sign in with a code instead.' : err)
  }
  const send = async (resend = false) => {
    setBusy(true); setError(undefined)
    const err = await acct().signInWithEmail(email.trim())
    setBusy(false)
    if (err) return setError(err)
    setMode('sent')
    if (resend) useUI.getState().showToast('Code sent')
  }
  const verify = async (c: string) => {
    setBusy(true); setError(undefined)
    const err = await acct().verifyCode(email.trim(), c)
    if (err) { setBusy(false); setError(err) } // on success the session updates and App re-renders
  }
  const onCode = (v: string) => {
    const c = v.replace(/\D/g, '').slice(0, 10)
    setCode(c)
    if (c.length === 8 && !busy) void verify(c) // Supabase default OTP length is 8; Continue covers other lengths
  }
  const emailOk = /\S+@\S+\.\S+/.test(email.trim())

  return (
    <div className="min-h-full bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-[420px] rounded-2xl p-6 shadow-[var(--shadow-dialog)]">
        <div className="flex items-center gap-2 mb-8">
          <GoldMark size={24} />
          <span className="text-sm text-foreground">Golden Tool</span>
        </div>

        {mode === 'password' && (
          <form onSubmit={e => { e.preventDefault(); if (emailOk && password && !busy) void withPassword() }} className="space-y-6">
            <div>
              <h1 className="text-lg text-foreground">Sign in</h1>
              <p className="text-sm text-muted-foreground mt-2 leading-5">Use the email from your purchase.</p>
            </div>
            <Field label="Email">
              <Input type="email" autoFocus required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" error={error}>
              <Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
            </Field>
            <div className="space-y-2">
              <Button type="submit" variant="primary" className="w-full" disabled={busy || !emailOk || !password}>{busy ? 'Signing in…' : 'Sign in'}</Button>
              <Button type="button" variant="ghost" className="w-full" disabled={busy || !emailOk} onClick={() => setMode('code')}>First time here, or forgot your password?</Button>
            </div>
          </form>
        )}

        {mode === 'code' && (
          <form onSubmit={e => { e.preventDefault(); if (emailOk && !busy) void send() }} className="space-y-6">
            <div>
              <h1 className="text-lg text-foreground">Sign in with a code</h1>
              <p className="text-sm text-muted-foreground mt-2 leading-5">We'll email a one-time code to {email.trim() || 'your address'}. After you're in, you can create a password.</p>
            </div>
            <Field label="Email" error={error}>
              <Input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
            </Field>
            <div className="space-y-2">
              <Button type="submit" variant="primary" className="w-full" disabled={busy || !emailOk}>{busy ? 'Sending…' : 'Send code'}</Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setMode('password'); setError(undefined) }}>Back</Button>
            </div>
          </form>
        )}

        {mode === 'sent' && (
          <form onSubmit={e => { e.preventDefault(); if (code.length >= 6 && !busy) void verify(code) }} className="space-y-6">
            <div>
              <h1 className="text-lg text-foreground">Check your email</h1>
              <p className="text-sm text-muted-foreground mt-2 leading-5">We sent a code to {email}.</p>
            </div>
            <Field label="Code" error={error}>
              <Input inputMode="numeric" autoComplete="one-time-code" maxLength={10} autoFocus value={code} onChange={e => onCode(e.target.value)} className="!h-12 text-center !text-2xl tracking-[0.3em]" />
            </Field>
            <div className="space-y-2">
              <Button type="submit" variant="primary" className="w-full" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Continue'}</Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setMode('password'); setCode(''); setError(undefined) }}>Use another email</Button>
            </div>
            <button type="button" disabled={busy} onClick={() => void send(true)} className="block mx-auto text-xs text-muted-foreground hover:text-foreground">Resend code</button>
          </form>
        )}

        <p className="text-xs text-muted-foreground mt-6">Your data is tied to this email and syncs to every device you sign in on.</p>
      </Card>
    </div>
  )
}
