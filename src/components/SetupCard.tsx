import { useState } from 'react'
import { CheckIcon, ChevronRightIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI, type Tab } from '../ui-state'
import { hasModule } from '../lib/access'
import { Card, Chip, cx } from './ui'

const KEY = 'golden-tool:setup-skipped'

/** Mochi Home "Setup your workspace" card: progress %, rows with a tile, label and "›". Hidden once complete or skipped. */
export default function SetupCard() {
  const s = useStore()
  const setTab = useUI(x => x.setTab)
  const [skipped, setSkipped] = useState(() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })
  const steps: { label: string; done: boolean; tab: Tab; addon?: boolean }[] = [
    { label: 'Set your monthly limit', done: s.settings.monthlyLimit > 0, tab: 'settings' },
    { label: 'Add your first expense', done: s.expenses.length > 0, tab: 'home' },
    { label: 'Add a recurring bill', done: s.recurring.length > 0, tab: 'activity' },
    { label: 'Set a category budget', done: s.categories.some(c => (c.budget ?? 0) > 0), tab: 'reports', addon: !hasModule(s.settings, 'reports') },
    { label: 'Add a goal or a debt', done: s.goals.length > 0 || s.debts.length > 0, tab: 'goals', addon: !hasModule(s.settings, 'goals') && !hasModule(s.settings, 'debts') },
  ]
  const done = steps.filter(x => x.done).length
  if (skipped || done === steps.length) return null
  const pct = Math.round((done / steps.length) * 100)
  const skip = () => { try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } setSkipped(true) }
  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative h-4 w-4 rounded-full" style={{ background: `conic-gradient(var(--gold) ${pct}%, var(--muted-2) 0)` }}><span className="absolute inset-[3px] rounded-full bg-card" /></span>
            {pct}%
          </span>
          <button onClick={skip} className="text-sm text-muted-foreground hover:text-foreground">Skip</button>
        </div>
        <h2 className="text-lg text-foreground mt-5">Set up Golden Tool</h2>
        <p className="text-sm text-muted-foreground mt-2">Five steps and the month takes care of itself.</p>
      </div>
      <div className="px-4 pb-4 space-y-2">
        {steps.map(st => (
          <button key={st.label} onClick={() => setTab(st.tab)} className="t w-full h-[52px] px-3 rounded-xl border border-border bg-card hover:bg-muted flex items-center gap-3 text-left">
            <span className={cx('h-6 w-6 rounded-md inline-flex items-center justify-center shrink-0', st.done ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground')}>{st.done ? <CheckIcon className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>
            <span className={cx('flex-1 text-sm', st.done ? 'text-muted-foreground line-through' : 'text-foreground')}>{st.label}</span>
            {st.addon && !st.done && <Chip>Add-on</Chip>}
            <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </Card>
  )
}
