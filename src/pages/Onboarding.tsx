import { useState, type ReactNode } from 'react'
import { useStore } from '../store'
import { CURRENCIES } from '../lib/money'
import type { Theme } from '../types'
import { Button, Field, Input, Segmented, Select } from '../components/ui'
import { GoldMark } from '../components/Layout'

const THEME_OPTIONS: { value: Theme; label: string }[] = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]

/** The page around sign-in and first-run: a white card on grey on desktop, the whole screen on phones. The logo is its only colour. */
export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-card sm:bg-background flex justify-center sm:items-center sm:p-6">
      <div className="w-full sm:max-w-[420px] px-4 pt-8 pb-[calc(24px+env(safe-area-inset-bottom))] sm:p-6 sm:rounded-2xl sm:bg-card sm:border sm:border-border sm:shadow-[var(--shadow-dialog)]">
        <div className="flex items-center gap-2 mb-8">
          <GoldMark size={24} />
          <span className="text-sm text-foreground">Golden Tool</span>
        </div>
        {children}
      </div>
    </div>
  )
}

const STEPS = [
  { title: 'Welcome to Golden Tool', text: 'You set a monthly limit, log what you spend and see what is left. Setup takes two steps.', next: 'Get started' },
  { title: 'Your monthly limit', text: 'The most you want to spend in a month, rent and fixed bills included. You can change it anytime.', next: 'Continue' },
  { title: 'Appearance', text: 'You can change this later in Settings.', next: 'Start' },
]

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [currency, setCurrency] = useState('USD')
  const [limit, setLimit] = useState('')
  const [theme, setTheme] = useState<Theme>('light')
  const amount = parseFloat(limit)
  const blocked = step === 1 && !(amount > 0)
  const update = useStore.getState().updateSettings
  const next = () => {
    if (blocked) return
    if (step < 2) setStep(step + 1)
    else update({ currency, monthlyLimit: amount, theme, onboarded: true })
  }
  const s = STEPS[step]
  return (
    <Frame>
      <form onSubmit={e => { e.preventDefault(); next() }}>
        <h1 className="text-lg text-foreground">{s.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{s.text}</p>

        {step === 1 && (
          <div className="grid grid-cols-[104px_1fr] gap-3 mt-6">
            <Field label="Currency">
              <Select value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Monthly limit">
              <Input autoFocus type="number" inputMode="decimal" min="0" step="any" placeholder="0" className="tabular-nums" value={limit} onChange={e => setLimit(e.target.value)} />
            </Field>
          </div>
        )}
        {/* The theme applies as soon as it is picked, so the choice is seen before "Start". */}
        {step === 2 && <Segmented block className="mt-6 max-sm:h-12 max-sm:[&>button]:h-11" value={theme} options={THEME_OPTIONS} onChange={t => { setTheme(t); update({ theme: t }) }} />}

        <Button type="submit" variant="primary" className="w-full mt-8" disabled={blocked}>{s.next}</Button>
        <div className="flex items-center justify-between mt-2 min-h-11">
          <span className="text-xs text-muted-foreground">Step {step + 1} of 3</span>
          {step > 0 && <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
        </div>
      </form>
    </Frame>
  )
}
