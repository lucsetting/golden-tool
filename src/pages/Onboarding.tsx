import { useState } from 'react'
import { useStore } from '../store'
import { CURRENCIES } from '../lib/money'
import type { Theme } from '../types'
import { Button, Card, Field, Segmented, Select, cx, inputCls } from '../components/ui'

const THEME_OPTIONS: { value: Theme; label: string }[] = [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }]

export function GoldMark({ size = 36 }: { size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}${size > 96 ? 'logo-512.png' : 'logo-192.png'}`} width={size} height={size} alt="Golden Tool" className="shrink-0 select-none" draggable={false} />
}

export default function Onboarding() {
  const updateSettings = useStore(s => s.updateSettings)
  const [step, setStep] = useState(1)
  const [currency, setCurrency] = useState('USD')
  const [limit, setLimit] = useState('')
  const [theme, setTheme] = useState<Theme>('light')
  const amount = parseFloat(limit)
  const valid = amount > 0

  const pick = (t: Theme) => { setTheme(t); updateSettings({ theme: t }) }
  const finish = () => valid && updateSettings({ currency, monthlyLimit: amount, theme, onboarded: true })

  return (
    <div className="min-h-full bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-[480px] rounded-2xl p-6 shadow-[var(--shadow-dialog)]">
        <div className="flex items-center gap-2 mb-8">
          <GoldMark size={24} />
          <span className="text-sm text-foreground">Golden Tool</span>
        </div>

        {step === 1 && (
          <div>
            <h1 className="text-lg text-foreground">Take control of your month.</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-5">Set a limit. Log what you spend. See exactly where your money goes.</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Field label="Currency">
              <Select value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Monthly limit" hint="Rent and fixed bills included. You can change this anytime.">
              <span className="relative block">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">$</span>
                <input autoFocus type="number" inputMode="decimal" min="0" placeholder="0" value={limit}
                  onChange={e => setLimit(e.target.value)} onKeyDown={e => e.key === 'Enter' && valid && setStep(3)}
                  className={cx(inputCls, 'h-14 pl-8 text-2xl tabular-nums')} />
              </span>
            </Field>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="text-sm text-foreground mb-3">Appearance</div>
            <Segmented className="w-full" value={theme} options={THEME_OPTIONS} onChange={pick} />
          </div>
        )}

        <Button variant="primary" className="w-full mt-8" disabled={step === 2 && !valid}
          onClick={() => (step < 3 ? setStep(step + 1) : finish())}>
          {step === 1 ? 'Get started' : step === 2 ? 'Continue' : 'Start'}
        </Button>

        <div className="flex items-center justify-between mt-4 h-8">
          <div className="flex gap-1.5" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map(i => <span key={i} className={cx('h-1.5 w-1.5 rounded-full', i === step ? 'bg-primary' : 'bg-muted-2')} />)}
          </div>
          {step > 1 && <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>Back</Button>}
        </div>
      </Card>
    </div>
  )
}
