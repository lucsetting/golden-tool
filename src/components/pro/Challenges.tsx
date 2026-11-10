import { useMemo, useState } from 'react'
import { CheckIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { Button, Card, CardHeader, Chip, Dialog, Empty, Field, IconButton, Input, ProgressBar, Select, TableRow, cx } from '../ui'
import { ESSENTIALS } from '../../lib/calc'
import { addDays, dateLabel, fmt, plural, todayISO } from '../../lib/money'
import { isRunning, noSpendWeek, week52 } from '../../lib/goals'
import { deleteWithUndo } from '../../lib/undo'
import { useGoals } from '../goals/shared'
import type { Challenge } from '../../types'

const shortDate = (iso: string) => new Date(iso + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const TITLE = { '52week': '52-week challenge', nospend: 'No-spend week' }
const end = (c: Challenge) => {
  const before = c.ended
  useStore.getState().patchIn('challenges', c.id, { ended: todayISO() })
  useUI.getState().showToast('Challenge ended', 'ok', { label: 'Undo', run: () => useStore.getState().patchIn('challenges', c.id, { ended: before }) })
}

function Start({ kind, onClose }: { kind: Challenge['kind']; onClose: () => void }) {
  const { goals, currency } = useGoals()
  const categories = useStore(s => s.categories)
  const [goal, setGoal] = useState(goals[0]?.id ?? '')
  const [base, setBase] = useState('1')
  const [start, setStart] = useState(todayISO())
  const [allowed, setAllowed] = useState<string[]>(ESSENTIALS)
  const f = (n: number) => fmt(n, currency)
  const ok = start >= todayISO() && (kind === 'nospend' || (!!goal && Number(base) > 0))
  const save = () => {
    useStore.getState().addTo('challenges', kind === '52week' ? { kind, start, goalId: goal, base: Number(base), done: [] } : { kind, start, essentials: allowed, done: [] })
    onClose()
  }
  return (
    <Dialog open onClose={onClose} title={`Start a ${TITLE[kind].toLowerCase()}`}
      description={kind === '52week' ? 'Week 1 asks for the base amount, week 2 for twice that, up to 52 times in the last week. Each week you mark done is added to the goal.' : 'Seven days with no expenses outside the categories you allow. The app checks it from the expenses you record; bills do not count.'}>
      <div className="space-y-5">
        {kind === '52week' ? (
          goals.length === 0 ? <p className="text-sm text-muted-foreground">Add a goal first: each week's amount is saved toward it.</p> : (
            <>
              <Field label="Goal that receives the money"><Select value={goal} onChange={e => setGoal(e.target.value)}>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Base amount" hint={Number(base) > 0 ? `Week 52: ${f(Number(base) * 52)}. In total: ${f(Number(base) * 1378)}` : undefined}><Input type="number" inputMode="decimal" min="0" value={base} onChange={e => setBase(e.target.value)} autoFocus /></Field>
                <Field label="First week starts"><Input type="date" min={todayISO()} value={start} onChange={e => setStart(e.target.value)} /></Field>
              </div>
            </>
          )
        ) : (
          <>
            <Field label="First day" hint={`Last day: ${dateLabel(addDays(start || todayISO(), 6))}`}><Input type="date" min={todayISO()} value={start} onChange={e => setStart(e.target.value)} /></Field>
            <fieldset>
              <legend className="text-sm text-foreground mb-2">Categories still allowed</legend>
              <div className="flex flex-wrap gap-2">
                {categories.filter(c => !c.hidden).map(c => {
                  const on = allowed.includes(c.id)
                  return <button key={c.id} type="button" aria-pressed={on} onClick={() => setAllowed(a => (on ? a.filter(x => x !== c.id) : [...a, c.id]))}
                    className={cx('t ctl-sm px-3 rounded-md text-sm', on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>{c.name}</button>
                })}
              </div>
            </fieldset>
          </>
        )}
        <div className="flex justify-end gap-2 [&>button]:max-sm:flex-1">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!ok} onClick={save}>Start challenge</Button>
        </div>
      </div>
    </Dialog>
  )
}

function Week52({ c }: { c: Challenge }) {
  const { goals, currency } = useGoals()
  const goal = goals.find(g => g.id === c.goalId)
  const w = week52(c), f = (n: number) => fmt(n, currency)
  const started = c.start <= todayISO()
  const mark = () => {
    if (!w.next || !goal) return
    const st = useStore.getState(), n = w.next
    const id = st.addTo('contributions', { goalId: goal.id, amount: w.amount, date: todayISO(), source: 'challenge' }).id
    st.patchIn('challenges', c.id, { done: [...c.done, n] })
    useUI.getState().showToast(`Week ${n} done. ${f(w.amount)} added to ${goal.name}`, 'ok', { label: 'Undo', run: () => {
      useStore.setState(s => ({ contributions: s.contributions.filter(x => x.id !== id) }))
      useStore.getState().patchIn('challenges', c.id, { done: c.done })
    } })
  }
  return (
    <Card>
      <CardHeader title={<>{TITLE['52week']}{goal && <span className="text-muted-foreground"> · {goal.name}</span>}</>} right={<Button size="sm" onClick={() => end(c)}>End challenge</Button>} />
      <div className="p-4 sm:p-5 flex flex-wrap items-center gap-x-6 gap-y-4 border-b border-border">
        <div className="min-w-0 flex-1 basis-56 text-sm">
          {!started ? <div className="text-foreground">Starts {dateLabel(c.start)}</div>
            : w.next ? <><div className="text-foreground tabular-nums">Week {w.next}: set aside {f(w.amount)}</div><div className="text-muted-foreground mt-1">{w.next < w.week ? `Week ${w.week} of 52 has started. ${plural(w.week - c.done.length, 'week')} to catch up.` : `Week ${w.week} of 52, until ${shortDate(addDays(w.nextStarts, -1))}`}</div></>
              : <><div className="text-foreground">Week {w.week} is done</div><div className="text-muted-foreground mt-1">Week {w.week + 1} starts {dateLabel(w.nextStarts)}</div></>}
          {!goal && <div className="text-destructive mt-1">The goal of this challenge was deleted.</div>}
        </div>
        {started && w.next && goal && <Button variant="primary" className="max-sm:w-full" onClick={mark}><CheckIcon /><span>Mark week {w.next} done</span></Button>}
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums"><span className="text-foreground">{f(w.saved)} <span className="text-muted-foreground">of {f(w.total)}</span></span><span className="text-xs text-muted-foreground">{c.done.length} of 52 weeks</span></div>
        <ProgressBar value={(c.done.length / 52) * 100} className="mt-3" />
        <ol className="mt-4 grid grid-cols-[repeat(13,minmax(0,1fr))] sm:grid-cols-[repeat(26,minmax(0,1fr))] gap-1" aria-label="The 52 weeks">
          {Array.from({ length: 52 }, (_, i) => i + 1).map(n => {
            const done = c.done.includes(n), due = !done && started && n <= w.week
            return <li key={n} title={`Week ${n}: ${f(n * (c.base ?? 0))}${done ? ', done' : due ? ', to do' : ''}`}
              className={cx('h-5 rounded-sm text-[10px] leading-5 text-center tabular-nums', done ? 'bg-primary text-primary-foreground' : due ? 'shadow-[inset_0_0_0_1px_var(--foreground)] text-foreground' : 'bg-muted text-muted-foreground')}>{n}</li>
          })}
        </ol>
      </div>
    </Card>
  )
}

function NoSpend({ c }: { c: Challenge }) {
  const expenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const currency = useStore(s => s.settings.currency)
  const w = useMemo(() => noSpendWeek(c, expenses), [c, expenses])
  const today = todayISO(), day = w.days.filter(d => d.date <= today).length
  const broke = w.days.flatMap(d => d.broke)
  const allowed = categories.filter(x => c.essentials?.includes(x.id)).map(x => x.name)
  return (
    <Card>
      <CardHeader title={TITLE.nospend} right={<><Chip tone={w.state === 'broken' ? 'bad' : 'outline'}>{w.state === 'broken' ? 'Broken' : day ? `Day ${day} of 7` : `Starts ${dateLabel(c.start)}`}</Chip><Button size="sm" onClick={() => end(c)}>End challenge</Button></>} />
      <div className="p-4 sm:p-5">
        <ol className="grid grid-cols-7 gap-1.5">
          {w.days.map(d => (
            <li key={d.date} className={cx('rounded-lg py-2 flex flex-col items-center gap-1.5 text-xs', d.state === 'broken' ? 'bg-destructive-soft text-destructive' : d.state === 'ok' ? 'bg-muted text-foreground' : 'shadow-[inset_0_0_0_1px_var(--border)] text-muted-foreground')}>
              <span>{new Date(d.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
              {d.state === 'ok' ? <CheckIcon className="h-4 w-4" aria-label="No expenses outside the allowed categories" /> : d.state === 'broken' ? <XMarkIcon className="h-4 w-4" aria-label="Broken" /> : <span className="h-4 leading-4" aria-label="Not yet">·</span>}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted-foreground leading-5">
          {shortDate(c.start)} to {shortDate(addDays(c.start, 6))}. Allowed: {allowed.length ? allowed.join(', ') : 'no category'}. Bills do not count.
        </p>
      </div>
      {broke.map(e => (
        <TableRow key={e.id} className="border-t! border-b-0! tabular-nums">
          <span className="flex-1 min-w-0 truncate text-foreground">{e.name}</span>
          <span className="text-muted-foreground max-sm:text-xs">{dateLabel(e.date)}</span>
          <span className="w-24 text-right text-foreground">{fmt(e.amount, currency)}</span>
        </TableRow>
      ))}
    </Card>
  )
}

/** Savings challenges: the ones running, then the ones that are over. */
export default function Challenges() {
  const challenges = useStore(s => s.challenges)
  const expenses = useStore(s => s.expenses)
  const currency = useStore(s => s.settings.currency)
  const [starting, setStarting] = useState<Challenge['kind'] | null>(null)
  const running = challenges.filter(c => isRunning(c, expenses)), past = challenges.filter(c => !running.includes(c)).reverse()
  const result = (c: Challenge) => {
    if (c.kind === '52week') { const w = week52(c); return w.finished ? 'All 52 weeks done' : `Ended after ${plural(c.done.length, 'week')}, ${fmt(w.saved, currency)} saved` }
    const w = noSpendWeek(c, expenses)
    return w.state === 'kept' ? 'Kept for all seven days' : w.state === 'broken' ? `Broken on ${dateLabel(w.days.find(d => d.state === 'broken')!.date)}` : `Ended early after ${plural(w.clean, 'day')}`
  }
  const buttons = (
    <div className="flex flex-wrap gap-2 max-sm:[&>button]:flex-1">
      <Button onClick={() => setStarting('52week')}><PlusIcon /><span>52-week challenge</span></Button>
      <Button onClick={() => setStarting('nospend')}><PlusIcon /><span>No-spend week</span></Button>
    </div>
  )
  return (
    <div className="space-y-6">
      {running.length === 0
        ? <Card><Empty title="No challenge running" text="A 52-week challenge saves a little more each week toward a goal. A no-spend week is seven days with only the expenses you allow." action={buttons} /></Card>
        : <>{buttons}{running.map(c => (c.kind === '52week' ? <Week52 key={c.id} c={c} /> : <NoSpend key={c.id} c={c} />))}</>}
      {past.length > 0 && (
        <Card>
          <CardHeader title="Past challenges" />
          {past.map(c => (
            <TableRow key={c.id}>
              <span className="flex-1 min-w-0">
                <span className="block text-foreground truncate">{TITLE[c.kind]}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">Started {shortDate(c.start)} · {result(c)}</span>
              </span>
              <IconButton size="sm" label={`Delete this ${TITLE[c.kind].toLowerCase()}`} onClick={() => deleteWithUndo('challenges', c.id, 'Challenge deleted')}><TrashIcon /></IconButton>
            </TableRow>
          ))}
        </Card>
      )}
      {starting && <Start kind={starting} onClose={() => setStarting(null)} />}
    </div>
  )
}
