import { useState } from 'react'
import { useAccount } from '../account'
import { useUI } from '../ui-state'
import { Button, Field, Input } from '../components/ui'
import { Frame } from './Onboarding'

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
  const head = (title: string, text: string) => (
    <div>
      <h1 className="text-lg text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1">{text}</p>
    </div>
  )

  return (
    <Frame>
      {mode === 'password' && (
        <form onSubmit={e => { e.preventDefault(); if (emailOk && password && !busy) void withPassword() }} className="space-y-5">
          {head('Sign in', 'Use the email from your purchase.')}
          <Field label="Email">
            <Input type="email" autoFocus required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" error={error}>
            <Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
          </Field>
          <div className="space-y-2 pt-1">
            <Button type="submit" variant="primary" className="w-full" disabled={busy || !emailOk || !password}>{busy ? 'Signing in…' : 'Sign in'}</Button>
            <Button type="button" variant="ghost" className="w-full" disabled={busy || !emailOk} onClick={() => setMode('code')}>First time here, or forgot your password?</Button>
          </div>
        </form>
      )}

      {mode === 'code' && (
        <form onSubmit={e => { e.preventDefault(); if (emailOk && !busy) void send() }} className="space-y-5">
          {head('Sign in with a code', `We'll email a one-time code to ${email.trim() || 'your address'}. After you're in, you can create a password.`)}
          <Field label="Email" error={error}>
            <Input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
          <div className="space-y-2 pt-1">
            <Button type="submit" variant="primary" className="w-full" disabled={busy || !emailOk}>{busy ? 'Sending…' : 'Send code'}</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => { setMode('password'); setError(undefined) }}>Back</Button>
          </div>
        </form>
      )}

      {mode === 'sent' && (
        <form onSubmit={e => { e.preventDefault(); if (code.length >= 6 && !busy) void verify(code) }} className="space-y-5">
          {head('Check your email', `We sent a code to ${email}.`)}
          <Field label="Code" error={error}>
            <Input inputMode="numeric" autoComplete="one-time-code" maxLength={10} autoFocus value={code} onChange={e => onCode(e.target.value)} className="h-12! text-center text-xl! tabular-nums tracking-[0.3em]" />
          </Field>
          <div className="space-y-2 pt-1">
            <Button type="submit" variant="primary" className="w-full" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Continue'}</Button>
            <Button type="button" className="w-full" disabled={busy} onClick={() => void send(true)}>Resend code</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => { setMode('password'); setCode(''); setError(undefined) }}>Use another email</Button>
          </div>
        </form>
      )}

      <p className="text-xs text-muted-foreground mt-6">Your data is tied to this email and syncs to every device you sign in on.</p>
    </Frame>
  )
}
