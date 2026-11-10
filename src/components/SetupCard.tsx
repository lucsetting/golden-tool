import { useState } from 'react'
import { CheckIcon, ChevronRightIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI, type Tab } from '../ui-state'
import { hasModule } from '../lib/access'
import { Button, Card, CardHeader, Chip, TableRow, cx } from './ui'

const KEY = 'golden-tool:setup-skipped'

/** Home setup list: one row per step, each opens the place where it is done. Hidden once complete or skipped. */
export default function SetupCard() {
  const settings = useStore(s => s.settings)
  const hasExpense = useStore(s => s.expenses.length > 0)
  const hasBill = useStore(s => s.recurring.length > 0)
  const hasBudget = useStore(s => s.categories.some(c => (c.budget ?? 0) > 0))
  const hasGoalOrDebt = useStore(s => s.goals.length > 0 || s.debts.length > 0)
  const [skipped, setSkipped] = useState(() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })
  const steps: { label: string; done: boolean; tab?: Tab; addon?: boolean }[] = [
    { label: 'Set your monthly limit', done: settings.monthlyLimit > 0, tab: 'settings' },
    { label: 'Add your first expense', done: hasExpense },
    { label: 'Add a monthly bill', done: hasBill, tab: 'bills' },
    { label: 'Set a category budget', done: hasBudget, tab: 'budgets' },
    { label: 'Add a goal or a debt', done: hasGoalOrDebt, tab: 'goals', addon: !hasModule(settings, 'goals') && !hasModule(settings, 'debts') },
  ]
  const done = steps.filter(x => x.done).length
  if (skipped || done === steps.length) return null
  const skip = () => { try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } setSkipped(true) }
  return (
    <Card>
      <CardHeader title="Set up Golden Tool" right={<><span className="text-sm text-muted-foreground tabular-nums">{done} of {steps.length} done</span><Button variant="ghost" size="sm" onClick={skip}>Skip</Button></>} />
      {steps.map(st => (
        <TableRow key={st.label} onClick={() => (st.tab ? useUI.getState().setTab(st.tab) : useUI.getState().openSheet())}>
          <span className={cx('h-6 w-6 rounded-md inline-flex items-center justify-center shrink-0', st.done ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground')}>{st.done ? <CheckIcon className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>
          <span className={cx('flex-1', st.done ? 'text-muted-foreground line-through' : 'text-foreground')}>{st.label}</span>
          {st.addon && !st.done && <Chip>Add-on</Chip>}
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
        </TableRow>
      ))}
    </Card>
  )
}
