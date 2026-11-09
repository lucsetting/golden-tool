import { useState } from 'react'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { Button, Card, Chip, Dialog, Empty, Field, IconButton, Input, ProgressBar } from '../ui'
import { fmt, todayISO } from '../../lib/money'
import type { Goal } from '../../types'

const GOAL_COLOR = '#E4B44A' // stored on the goal for data compatibility; the UI draws every bar in the neutral primary

/** Amount to set aside per month to hit the deadline; 0 when reached, no deadline or deadline passed. */
export function monthlyNeed(g: Goal): number {
  const left = g.target - g.saved
  if (left <= 0 || !g.deadline) return 0
  const days = (new Date(g.deadline).getTime() - new Date(todayISO()).getTime()) / 864e5
  return days <= 0 ? 0 : left / Math.max(1, Math.ceil(days / 30.44))
}

function need(g: Goal, currency: string) {
  if (g.target - g.saved <= 0) return 'Goal reached'
  if (!g.deadline) return null
  const days = (new Date(g.deadline).getTime() - new Date(todayISO()).getTime()) / 864e5
  if (days <= 0) return 'Deadline passed'
  const when = new Date(g.deadline + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `Needs ${fmt(monthlyNeed(g), currency)}/mo until ${when}`
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
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!ok} onClick={save}>{goal ? 'Save goal' : 'Add goal'}</Button>
      </div>
    </div>
  )
}

export function GoalCard({ g, currency, onEdit }: { g: Goal; currency: string; onEdit: () => void }) {
  const { updateGoal, deleteGoal } = useStore.getState()
  const [adding, setAdding] = useState(false)
  const [amt, setAmt] = useState('')
  const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0
  const hint = need(g, currency)
  const add = () => { const n = Number(amt); if (n > 0) updateGoal(g.id, { saved: g.saved + n }); setAmt(''); setAdding(false) }
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm truncate">{g.name}</span>
        <Chip>{Math.round(pct)}%</Chip>
      </div>
      <div className="mt-4 text-2xl tabular-nums">{fmt(g.saved, currency)} <span className="text-sm text-muted-foreground">of {fmt(g.target, currency)}</span></div>
      <ProgressBar value={pct} className="mt-4" />
      {hint && <p className="text-xs text-muted-foreground mt-3">{hint}</p>}
      <div className="mt-4 flex items-center gap-2">
        {adding ? (
          <>
            <Input autoFocus type="number" inputMode="decimal" className="h-8 w-28" value={amt} onChange={e => setAmt(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Amount" />
            <Button size="sm" variant="primary" onClick={add}>Add</Button>
          </>
        ) : (
          <Button size="sm" onClick={() => setAdding(true)}><PlusIcon />Add money</Button>
        )}
        <span className="flex-1" />
        <IconButton size="sm" label="Edit goal" onClick={onEdit}><PencilIcon /></IconButton>
        <IconButton size="sm" label="Delete goal" onClick={() => confirm(`Delete "${g.name}"?`) && deleteGoal(g.id)}><TrashIcon /></IconButton>
      </div>
    </Card>
  )
}

/** Goal grid + add/edit dialog. The page owns the dialog state so its header can open it. */
export type GoalSheet = { goal?: Goal } | null
export default function Goals({ sheet, setSheet }: { sheet: GoalSheet; setSheet: (s: GoalSheet) => void }) {
  const goals = useStore(s => s.goals)
  const currency = useStore(s => s.settings.currency)
  return (
    <>
      {goals.length === 0 ? (
        <Card><Empty title="No goals yet" text="Set a target and see exactly what to save each month." action={<Button variant="primary" size="sm" onClick={() => setSheet({})}><PlusIcon />Add goal</Button>} /></Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {goals.map(g => <GoalCard key={g.id} g={g} currency={currency} onEdit={() => setSheet({ goal: g })} />)}
        </div>
      )}
      <Dialog open={!!sheet} onClose={() => setSheet(null)} title={sheet?.goal ? 'Edit goal' : 'Add goal'}>
        {sheet && <GoalForm goal={sheet.goal} onClose={() => setSheet(null)} />}
      </Dialog>
    </>
  )
}
