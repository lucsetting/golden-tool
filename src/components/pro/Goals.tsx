import { useState } from 'react'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { Button, Card, CardHeader, Dialog, Empty, Field, IconButton, Input, ProgressBar, TableHead } from '../ui'
import { fmt, todayISO } from '../../lib/money'
import { deleteWithUndo } from '../../lib/undo'
import type { Goal } from '../../types'

/** Stored on new goals because the field is required; every goal is drawn in the neutral chart colour. */
export const GOAL_COLOR = '#737373'

/** Amount to set aside per month to hit the deadline; 0 when reached, no deadline or deadline passed. */
export function monthlyNeed(g: Goal): number {
  const left = g.target - g.saved
  if (left <= 0 || !g.deadline) return 0
  const days = (new Date(g.deadline).getTime() - new Date(todayISO()).getTime()) / 864e5
  return days <= 0 ? 0 : left / Math.max(1, Math.ceil(days / 30.44))
}

function need(g: Goal, currency: string) {
  if (g.target - g.saved <= 0) return 'Goal reached'
  if (!g.deadline) return 'No deadline'
  const days = (new Date(g.deadline).getTime() - new Date(todayISO()).getTime()) / 864e5
  if (days <= 0) return 'Deadline passed'
  const when = new Date(g.deadline + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(monthlyNeed(g), currency)} per month until ${when}`
}

function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { addGoal, updateGoal } = useStore.getState()
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal ? String(goal.target) : '')
  const [saved, setSaved] = useState(goal ? String(goal.saved) : '')
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const ok = name.trim() && Number(target) > 0
  const save = () => {
    const d = { name: name.trim(), target: Number(target), saved: Number(saved) || 0, deadline: deadline || undefined, color: goal?.color ?? GOAL_COLOR }
    if (goal) updateGoal(goal.id, d); else addGoal(d)
    onClose()
  }
  return (
    <div className="space-y-5">
      <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Emergency fund" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target"><Input type="number" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="5000" /></Field>
        <Field label="Saved so far"><Input type="number" inputMode="decimal" value={saved} onChange={e => setSaved(e.target.value)} placeholder="0" /></Field>
      </div>
      <Field label="Deadline (optional)"><Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></Field>
      <div className="flex justify-end gap-2 [&>button]:max-sm:flex-1">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!ok} onClick={save}>{goal ? 'Save goal' : 'Add goal'}</Button>
      </div>
    </div>
  )
}

function GoalRow({ g, currency, onEdit }: { g: Goal; currency: string; onEdit: () => void }) {
  const [adding, setAdding] = useState(false)
  const [amt, setAmt] = useState('')
  const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0
  const add = () => { const n = Number(amt); if (n > 0) useStore.getState().updateGoal(g.id, { saved: g.saved + n }); setAmt(''); setAdding(false) }
  const amounts = <>{fmt(g.saved, currency)} <span className="text-muted-foreground">of {fmt(g.target, currency)}</span></>
  return (
    <div className="px-4 py-3 text-sm tabular-nums border-b border-border last:border-b-0 xl:min-h-14 xl:flex xl:items-center xl:gap-3">
      <div className="min-w-0 xl:flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-foreground">{g.name}</span>
          <span className="xl:hidden shrink-0">{amounts}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{need(g, currency)}</div>
      </div>
      <div className="flex items-center gap-3 max-xl:mt-3 xl:w-44">
        <ProgressBar value={pct} className="flex-1" />
        <span className="w-9 text-right text-xs text-muted-foreground">{Math.round(pct)}%</span>
      </div>
      <span className="max-xl:hidden w-52 text-right">{amounts}</span>
      <div className="flex items-center gap-1 max-xl:mt-2 max-sm:-mr-2 xl:w-60 xl:justify-end">
        {adding ? (
          <>
            <Input autoFocus type="number" inputMode="decimal" aria-label={`Contribution to ${g.name}`} className="h-8 w-28!" value={amt} onChange={e => setAmt(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Amount" />
            <Button size="sm" variant="primary" className="max-sm:px-4" onClick={add}>Add</Button>
          </>
        ) : (
          <Button size="sm" className="max-sm:px-3" onClick={() => setAdding(true)}><PlusIcon /><span>Add contribution</span></Button>
        )}
        <span className="flex-1 xl:hidden" />
        <IconButton size="sm" label={`Edit ${g.name}`} onClick={onEdit}><PencilIcon /></IconButton>
        <IconButton size="sm" label={`Delete ${g.name}`} onClick={() => deleteWithUndo('goals', g.id, 'Goal deleted')}><TrashIcon /></IconButton>
      </div>
    </div>
  )
}

/** The goal list with its add and edit dialog. */
export default function Goals() {
  const goals = useStore(s => s.goals)
  const currency = useStore(s => s.settings.currency)
  const [sheet, setSheet] = useState<{ goal?: Goal } | null>(null)
  return (
    <Card>
      <CardHeader title="Goals" right={goals.length > 0 && <Button variant="primary" size="sm" className="relative after:absolute after:-inset-1.5" onClick={() => setSheet({})}><PlusIcon /><span>Add goal</span></Button>} />
      {goals.length === 0 ? (
        <Empty title="No goals yet" text="Add a goal with a target and, if you have one, a deadline. The list then shows the amount to set aside each month." action={<Button variant="primary" className="max-sm:px-4" onClick={() => setSheet({})}><PlusIcon /><span>Add goal</span></Button>} />
      ) : (
        <>
          <TableHead className="max-xl:hidden">
            <span className="flex-1">Goal</span>
            <span className="w-44">Progress</span>
            <span className="w-52 text-right">Saved</span>
            <span className="w-60" />
          </TableHead>
          {goals.map(g => <GoalRow key={g.id} g={g} currency={currency} onEdit={() => setSheet({ goal: g })} />)}
        </>
      )}
      <Dialog open={!!sheet} onClose={() => setSheet(null)} title={sheet?.goal ? 'Edit goal' : 'Add goal'}>
        {sheet && <GoalForm goal={sheet.goal} onClose={() => setSheet(null)} />}
      </Dialog>
    </Card>
  )
}
