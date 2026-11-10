import { useMemo } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { AnimatedNumber, Button, Card, CardHeader, Empty, IconButton, Metric, MetricTray, TableHead, TableRow } from '../ui'
import { fmt, monthLabel, plural, todayISO } from '../../lib/money'
import { autoPlan, goalStatus, monthlyNeed } from '../../lib/goals'
import { useGoals, useSafeToSave } from '../goals/shared'

/** The automatic plan: this month's safe-to-save split over the goals in priority order, written as contributions with one button. */
export default function GoalPlan() {
  const { goals, currency } = useGoals()
  const { safe, setAside, left, limit } = useSafeToSave()
  const plan = useMemo(() => autoPlan(goals, left), [goals, left])
  const sum = plan.reduce((s, p) => s + p.amount, 0)
  const f = (n: number) => fmt(n, currency)
  const month = monthLabel(todayISO().slice(0, 7))
  const apply = () => {
    const st = useStore.getState(), date = todayISO()
    const ids = plan.filter(p => p.amount > 0).map(p => st.addTo('contributions', { goalId: p.goal.id, amount: p.amount, date, source: 'plan' }).id)
    useUI.getState().showToast(`${plural(ids.length, 'contribution')} added`, 'ok', { label: 'Undo', run: () => useStore.setState(s => ({ contributions: s.contributions.filter(c => !ids.includes(c.id)) })) })
  }

  if (goals.length === 0) {
    return <Card><Empty title="No goals to plan" text="The plan splits what you can save this month over your goals, in the order you give them." action={<Button variant="primary" className="max-sm:px-4" onClick={() => useUI.getState().setTab('goals')}>Open goals</Button>} /></Card>
  }
  return (
    <div className="space-y-6">
      <MetricTray>
        <Metric label="Safe to save" value={<AnimatedNumber value={safe} format={f} />} sub={limit > 0 ? `${month}, under the monthly limit` : 'Set a monthly limit to get this number'} />
        <Metric label="Already set aside" value={<AnimatedNumber value={setAside} format={f} />} sub={`Contributions in ${month}`} />
        <Metric label="Left to plan" value={<AnimatedNumber value={left} format={f} />} sub="Safe to save minus what is set aside" />
      </MetricTray>
      <Card>
        <CardHeader title={`Plan for ${month}`} right={<span className="text-xs text-muted-foreground max-sm:hidden">Top of the list comes first</span>} />
        <TableHead className="max-sm:hidden">
          <span className="w-16">Priority</span>
          <span className="flex-1">Goal</span>
          <span className="w-36 text-right">Needs per month</span>
          <span className="w-32 text-right">This month</span>
        </TableHead>
        {plan.map(({ goal: g, amount }, i) => {
          const status = goalStatus(g), needs = status ?? f(monthlyNeed(g))
          return (
            <TableRow key={g.id} className="tabular-nums">
              <span className="flex shrink-0 sm:w-16 max-sm:-ml-2">
                <IconButton size="sm" label={`Move ${g.name} up`} disabled={i === 0} onClick={() => useStore.getState().moveGoal(g.id, -1)}><ChevronUpIcon /></IconButton>
                <IconButton size="sm" label={`Move ${g.name} down`} disabled={i === plan.length - 1} onClick={() => useStore.getState().moveGoal(g.id, 1)}><ChevronDownIcon /></IconButton>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-foreground">{g.name}</span>
                <span className="block sm:hidden text-xs text-muted-foreground mt-0.5">{status ?? `Needs ${needs} per month`}</span>
              </span>
              <span className="max-sm:hidden w-36 text-right text-muted-foreground">{needs}</span>
              <span className={amount > 0 ? 'sm:w-32 text-right text-foreground' : 'sm:w-32 text-right text-muted-foreground'}>{amount > 0 ? f(amount) : '—'}</span>
            </TableRow>
          )
        })}
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-t border-border">
          <p className="text-sm text-muted-foreground leading-5 basis-72 flex-1">
            {sum > 0 ? 'Each goal first gets what it needs for its deadline. What is left goes to the first goal with room.' : left <= 0 ? 'Nothing is left to plan this month.' : 'Every goal is already reached.'}
          </p>
          <Button variant="primary" className="max-sm:w-full" disabled={!(sum > 0)} onClick={apply}>{sum > 0 ? `Add ${f(sum)} as contributions` : 'Add as contributions'}</Button>
        </div>
      </Card>
    </div>
  )
}
