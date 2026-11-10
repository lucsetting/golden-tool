import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { Button, Dialog, Field, Input, Select } from '../ui'
import { expensesForMonth, monthStats, safeToSave } from '../../lib/calc'
import { setAside, withSaved } from '../../lib/goals'
import { currentMonthKey, todayISO } from '../../lib/money'
import { deleteWithUndo } from '../../lib/undo'
import type { Contribution } from '../../types'

/** Stored on new goals because the field is required; every goal is drawn in the neutral chart colour. */
export const GOAL_COLOR = '#737373'
export const SOURCE: Record<NonNullable<Contribution['source']>, string> = { opening: 'Opening amount', plan: 'Automatic plan', challenge: 'Challenge' }

/** The goals in priority order with what is saved toward each, and every contribution. */
export function useGoals() {
  const raw = useStore(s => s.goals)
  const contributions = useStore(s => s.contributions)
  const currency = useStore(s => s.settings.currency)
  const goals = useMemo(() => withSaved(raw, contributions), [raw, contributions])
  return { goals, contributions, currency }
}
/** Safe to save this month, and what already went to goals this month. */
export function useSafeToSave() {
  const expenses = useStore(s => s.expenses)
  const limit = useStore(s => s.settings.monthlyLimit)
  const recurring = useStore(s => s.recurring)
  const contributions = useStore(s => s.contributions)
  const goals = useStore(s => s.goals)
  return useMemo(() => {
    const mk = currentMonthKey()
    const safe = safeToSave(monthStats(expensesForMonth(expenses, mk), mk, limit, recurring)), aside = setAside(contributions, goals)
    return { safe, setAside: aside, left: Math.max(0, safe - aside), limit }
  }, [expenses, limit, recurring, contributions, goals])
}

/** Add a contribution to a goal, or edit one. `goalId` preselects the goal when adding. */
export function ContributionDialog({ contribution, goalId, onClose }: { contribution?: Contribution; goalId?: string; onClose: () => void }) {
  const { goals } = useGoals()
  const [goal, setGoal] = useState(contribution?.goalId ?? goalId ?? goals[0]?.id ?? '')
  const [amount, setAmount] = useState(contribution ? String(contribution.amount) : '')
  const [date, setDate] = useState(contribution?.date ?? todayISO())
  const [tried, setTried] = useState(false)
  const errs = {
    amount: Number(amount) > 0 || (contribution && Number(amount) < 0) ? undefined : 'Enter an amount greater than 0',
    date: date && date <= todayISO() ? undefined : 'Pick a valid date (not in the future)',
  }
  const save = () => {
    setTried(true)
    if (errs.amount || errs.date || !goal) return
    const data = { goalId: goal, amount: Number(amount), date }
    if (contribution) useStore.getState().patchIn('contributions', contribution.id, data); else useStore.getState().addTo('contributions', data)
    onClose()
  }
  return (
    <Dialog open onClose={onClose} title={contribution ? 'Edit contribution' : 'Add contribution'}>
      <div className="space-y-5">
        <Field label="Goal"><Select value={goal} onChange={e => setGoal(e.target.value)}>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" error={tried ? errs.amount : undefined}><Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} autoFocus /></Field>
          <Field label="Date" error={tried ? errs.date : undefined}><Input type="date" max={todayISO()} value={date} onChange={e => setDate(e.target.value)} /></Field>
        </div>
        <div className="flex items-center gap-2 [&>button]:max-sm:flex-1">
          {contribution && <Button variant="destructive" onClick={() => { deleteWithUndo('contributions', contribution.id, 'Contribution deleted'); onClose() }}>Delete</Button>}
          <span className="flex-1 max-sm:hidden" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>{contribution ? 'Save contribution' : 'Add contribution'}</Button>
        </div>
      </div>
    </Dialog>
  )
}
