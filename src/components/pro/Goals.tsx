import { useMemo, useState } from 'react'
import { ArrowLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { AnimatedNumber, Button, Card, CardHeader, Chip, Dialog, Empty, Field, IconButton, Input, Metric, MetricTray, ProgressBar, TableHead, TableRow } from '../ui'
import ChartCard, { LegendKey } from '../charts/ChartCard'
import Curve from '../charts/Curve'
import { dateLabel, fmt, monthLabel, todayISO } from '../../lib/money'
import { contributionsOf, milestones, monthlyNeed, pacePerMonth, paceSeries, type GoalNow } from '../../lib/goals'
import { deleteWithUndo } from '../../lib/undo'
import { ContributionDialog, GOAL_COLOR, SOURCE, useGoals } from '../goals/shared'
import type { Contribution } from '../../types'

const fullDate = (iso: string) => new Date(iso + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function need(g: GoalNow, currency: string) {
  if (g.target - g.saved <= 0) return 'Goal reached'
  if (!g.deadline) return 'No deadline'
  if (g.deadline <= todayISO()) return 'Deadline passed'
  return `${fmt(monthlyNeed(g), currency)} per month until ${fullDate(g.deadline)}`
}

/** Add a goal, or edit one. What is already saved is asked once, when the goal is added: it becomes the opening contribution. */
function GoalForm({ goal, onClose }: { goal?: GoalNow; onClose: () => void }) {
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal ? String(goal.target) : '')
  const [saved, setSaved] = useState('')
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const ok = name.trim() && Number(target) > 0
  const save = () => {
    const st = useStore.getState(), d = { name: name.trim(), target: Number(target), deadline: deadline || undefined }
    if (goal) st.patchIn('goals', goal.id, d)
    else {
      const added = st.addTo('goals', { ...d, color: GOAL_COLOR })
      if (Number(saved) > 0) st.addTo('contributions', { goalId: added.id, amount: Number(saved), date: todayISO(), source: 'opening' })
    }
    onClose()
  }
  return (
    <div className="space-y-5">
      <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Emergency fund" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target"><Input type="number" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="5000" /></Field>
        {goal
          ? <Field label="Deadline (optional)"><Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></Field>
          : <Field label="Already saved"><Input type="number" inputMode="decimal" value={saved} onChange={e => setSaved(e.target.value)} placeholder="0" /></Field>}
      </div>
      {!goal && <Field label="Deadline (optional)"><Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></Field>}
      <div className="flex justify-end gap-2 [&>button]:max-sm:flex-1">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!ok} onClick={save}>{goal ? 'Save goal' : 'Add goal'}</Button>
      </div>
    </div>
  )
}

/** One goal: saved against the pace, the four milestones and every contribution. */
function GoalDetail({ g, onBack, onEdit }: { g: GoalNow; onBack: () => void; onEdit: () => void }) {
  const { contributions, currency } = useGoals()
  const [dialog, setDialog] = useState<{ contribution?: Contribution } | null>(null)
  const mine = useMemo(() => contributionsOf(g.id, contributions), [g.id, contributions])
  const series = useMemo(() => paceSeries(g, mine).map(p => ({ x: p.t, label: fullDate(p.date), a: p.saved, b: p.pace })), [g, mine])
  const marks = useMemo(() => milestones(g, mine), [g, mine])
  const pace = pacePerMonth(mine), needed = monthlyNeed(g), pct = g.target > 0 ? (g.saved / g.target) * 100 : 0
  const f = (n: number) => fmt(n, currency)
  const hasPace = series.some(p => p.b !== null)
  const expected = marks[3].expected
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onBack}><ArrowLeftIcon /><span>All goals</span></Button>
        <span className="flex-1" />
        <IconButton label={`Edit ${g.name}`} onClick={onEdit}><PencilIcon /></IconButton>
        <IconButton label={`Delete ${g.name}`} onClick={() => { deleteWithUndo('goals', g.id, 'Goal deleted'); onBack() }}><TrashIcon /></IconButton>
        <Button variant="primary" onClick={() => setDialog({})}><PlusIcon /><span>Add contribution</span></Button>
      </div>
      <MetricTray>
        <Metric label="Saved" value={<AnimatedNumber value={g.saved} format={f} />} sub={`${Math.round(pct)}% of ${f(g.target)}`} />
        <Metric label="Needed per month" value={needed > 0 ? <AnimatedNumber value={needed} format={f} /> : '—'} sub={needed > 0 ? `Until ${fullDate(g.deadline!)}` : need(g, currency)} />
        <Metric label="Your pace" tone={needed > 0 && pace >= needed ? 'good' : undefined} value={<AnimatedNumber value={pace} format={f} />} sub="Per month, last three months" />
      </MetricTray>
      <ChartCard label={g.name} value={<AnimatedNumber value={g.saved} format={f} />}
        sub={g.saved >= g.target ? 'Goal reached' : expected ? `At your pace the target is reached in ${monthLabel(expected)}` : 'Add contributions to see when the target is reached'}
        right={<div className="flex gap-4 text-xs text-muted-foreground"><LegendKey color="var(--chart)">Saved</LegendKey>{hasPace && <LegendKey color="var(--chart-soft)">Pace for the deadline</LegendKey>}</div>}>
        <div className="pb-1"><Curve data={series} names={['Saved', hasPace ? 'Pace' : undefined]} currency={currency} step /></div>
      </ChartCard>
      <Card>
        <CardHeader title="Milestones" />
        {marks.map(m => (
          <TableRow key={m.pct} className="tabular-nums">
            <span className="w-12 text-foreground">{m.pct}%</span>
            <span className="flex-1 text-muted-foreground">{f(m.amount)}</span>
            {m.reached ? <><span className="text-muted-foreground max-sm:text-xs">{fullDate(m.reached)}</span><Chip tone="good">Reached</Chip></>
              : <span className="text-muted-foreground">{m.expected ? `Expected ${monthLabel(m.expected)}` : 'No pace yet'}</span>}
          </TableRow>
        ))}
      </Card>
      <Card>
        <CardHeader title="Contributions" right={<span className="text-sm text-muted-foreground tabular-nums">{mine.length}</span>} />
        {mine.length === 0
          ? <Empty title="No contributions yet" text="Each amount you set aside for this goal is listed here with its date." action={<Button variant="primary" className="max-sm:px-4" onClick={() => setDialog({})}><PlusIcon /><span>Add contribution</span></Button>} />
          : [...mine].reverse().map(c => (
            <TableRow key={c.id} onClick={() => setDialog({ contribution: c })}>
              <span className="flex-1 min-w-0 flex items-center gap-2"><span className="sr-only">Edit </span><span className="text-foreground">{dateLabel(c.date)}</span>{c.source && <Chip>{SOURCE[c.source]}</Chip>}</span>
              <span className="text-foreground tabular-nums">{f(c.amount)}</span>
            </TableRow>
          ))}
      </Card>
      {dialog && <ContributionDialog contribution={dialog.contribution} goalId={g.id} onClose={() => setDialog(null)} />}
    </div>
  )
}

function GoalRow({ g, currency, onOpen, onAdd }: { g: GoalNow; currency: string; onOpen: () => void; onAdd: () => void }) {
  const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0
  const amounts = <>{fmt(g.saved, currency)} <span className="text-muted-foreground">of {fmt(g.target, currency)}</span></>
  return (
    <div className="px-4 py-3 text-sm tabular-nums border-b border-border last:border-b-0 xl:min-h-14 xl:flex xl:items-center xl:gap-3">
      <button type="button" onClick={onOpen} className="t block w-full min-w-0 text-left rounded-md xl:flex-1 hover:opacity-70">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-foreground">{g.name}</span>
          <span className="xl:hidden shrink-0">{amounts}</span>
        </span>
        <span className="block text-xs text-muted-foreground mt-1">{need(g, currency)}</span>
      </button>
      <div className="flex items-center gap-3 max-xl:mt-3 xl:w-44">
        <ProgressBar value={pct} className="flex-1" />
        <span className="w-9 text-right text-xs text-muted-foreground">{Math.round(pct)}%</span>
      </div>
      <span className="max-xl:hidden w-52 text-right">{amounts}</span>
      <div className="flex items-center gap-1 max-xl:mt-2 max-sm:-mr-2 xl:w-52 xl:justify-end">
        <Button size="sm" className="max-sm:px-3" onClick={onAdd}><PlusIcon /><span>Add contribution</span></Button>
        <span className="flex-1 xl:hidden" />
        <IconButton size="sm" label={`Open ${g.name}`} onClick={onOpen}><ChevronRightIcon /></IconButton>
      </div>
    </div>
  )
}

/** The goal list, or one goal opened from it. `tray` is drawn above the list only. */
export default function Goals({ tray }: { tray?: React.ReactNode }) {
  const { goals, currency } = useGoals()
  const [sheet, setSheet] = useState<{ goal?: GoalNow } | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [addTo, setAddTo] = useState<string | null>(null)
  const open = goals.find(g => g.id === openId)
  const form = (
    <Dialog open={!!sheet} onClose={() => setSheet(null)} title={sheet?.goal ? 'Edit goal' : 'Add goal'}>
      {sheet && <GoalForm goal={sheet.goal} onClose={() => setSheet(null)} />}
    </Dialog>
  )
  if (open) return <><GoalDetail g={open} onBack={() => setOpenId(null)} onEdit={() => setSheet({ goal: open })} />{form}</>
  return (
    <div className="space-y-6">
      {tray}
      <Card>
        <CardHeader title="Goals" right={goals.length > 0 && <Button variant="primary" size="sm" className="relative after:absolute after:-inset-1.5" onClick={() => setSheet({})}><PlusIcon /><span>Add goal</span></Button>} />
        {goals.length === 0 ? (
          <Empty title="No goals yet" text="Add a goal with a target and, if you have one, a deadline. Each contribution you log builds its history, its pace and its milestones." action={<Button variant="primary" className="max-sm:px-4" onClick={() => setSheet({})}><PlusIcon /><span>Add goal</span></Button>} />
        ) : (
          <>
            <TableHead className="max-xl:hidden">
              <span className="flex-1">Goal</span>
              <span className="w-44">Progress</span>
              <span className="w-52 text-right">Saved</span>
              <span className="w-52" />
            </TableHead>
            {goals.map(g => <GoalRow key={g.id} g={g} currency={currency} onOpen={() => setOpenId(g.id)} onAdd={() => setAddTo(g.id)} />)}
          </>
        )}
      </Card>
      {form}
      {addTo && <ContributionDialog goalId={addTo} onClose={() => setAddTo(null)} />}
    </div>
  )
}
