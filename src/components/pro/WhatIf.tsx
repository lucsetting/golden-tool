import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { AnimatedNumber, Button, Card, CardHeader, Empty, Field, Input, Metric, MetricTray, Select } from '../ui'
import ChartCard, { LegendKey } from '../charts/ChartCard'
import Curve from '../charts/Curve'
import { currentMonthKey, fmt, monthAhead, monthLabel, plural, shiftMonth } from '../../lib/money'
import { STRATEGY, neverPaid, simulate } from '../../lib/debts'
import { useDebts, usePlan } from '../debts/shared'

/** Try an extra monthly amount or a one-off payment against the current payoff plan, then make it the plan. */
export default function WhatIf() {
  const { now: debts, currency, owedNow } = useDebts()
  const plan = usePlan()
  const cur = currentMonthKey()
  const [extra, setExtra] = useState(plan.extra ? String(plan.extra) : '')
  const [once, setOnce] = useState('')
  const [month, setMonth] = useState(cur)
  const trial = useMemo(() => ({ method: plan.method, extra: Math.max(0, Number(extra) || 0), oneOff: Number(once) > 0 ? { amount: Number(once), month } : undefined }), [plan.method, extra, once, month])
  const { base, sim } = useMemo(() => ({ base: simulate(debts, plan), sim: simulate(debts, trial) }), [debts, plan, trial])
  const f = (n: number) => fmt(n, currency)
  const same = trial.extra === plan.extra && JSON.stringify(trial.oneOff) === JSON.stringify(plan.oneOff)
  const months = base.months - sim.months, interest = Math.round((base.interestPaid - sim.interestPaid) * 100) / 100
  const never = neverPaid(sim)
  const data = useMemo(() => Array.from({ length: Math.max(base.rows.length, sim.rows.length) + 1 }, (_, i) => ({
    x: i, label: i ? monthAhead(i) : 'Today',
    value: i ? sim.rows[i - 1]?.balance ?? 0 : owedNow,
    compare: i ? base.rows[i - 1]?.balance ?? 0 : owedNow,
  })), [base, sim, owedNow])
  const apply = () => {
    const before = plan
    useStore.getState().setPlan({ extra: trial.extra, oneOff: trial.oneOff })
    useUI.getState().showToast('Payoff plan updated', 'ok', { label: 'Undo', run: () => useStore.getState().setPlan(before) })
  }

  if (!debts.some(d => d.balance > 0)) {
    return <Card><Empty title="No debts to plan" text="A what-if needs at least one debt with a balance in the payoff plan." action={<Button variant="primary" className="max-sm:px-4" onClick={() => useUI.getState().setTab('debts')}>Open payoff plan</Button>} /></Card>
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Try a change" right={<span className="text-xs text-muted-foreground">{STRATEGY[plan.method]}</span>} />
        <div className="p-4 sm:p-5 grid gap-4 sm:grid-cols-3">
          <Field label="Extra per month"><Input type="number" inputMode="decimal" min="0" placeholder="0" value={extra} onChange={e => setExtra(e.target.value)} /></Field>
          <Field label="One-off payment"><Input type="number" inputMode="decimal" min="0" placeholder="0" value={once} onChange={e => setOnce(e.target.value)} /></Field>
          <Field label="Paid in">
            <Select value={month} onChange={e => setMonth(e.target.value)} disabled={!(Number(once) > 0)}>
              {Array.from({ length: 25 }, (_, i) => shiftMonth(cur, i)).map(mk => <option key={mk} value={mk}>{mk === cur ? 'This month' : monthLabel(mk)}</option>)}
            </Select>
          </Field>
        </div>
        <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-t border-border">
          <p className="text-sm text-muted-foreground tabular-nums">
            {same ? 'This is your current payoff plan. Change a number to compare.' : never ? 'With these numbers the payments do not cover the interest.' : `Compared with your current plan: debt-free ${base.months === sim.months ? 'in the same month' : `${plural(Math.abs(months), 'month')} ${months > 0 ? 'sooner' : 'later'}`}, ${f(Math.abs(interest))} ${interest >= 0 ? 'less' : 'more'} interest.`}
          </p>
          <Button variant="primary" className="max-sm:w-full" disabled={same} onClick={apply}>Make this the payoff plan</Button>
        </div>
      </Card>
      <MetricTray>
        <Metric label="Debt-free" tone={never ? 'bad' : undefined} value={never ? 'Not reached' : monthAhead(sim.months)} sub={neverPaid(base) ? 'Current plan: not reached' : `Current plan: ${monthAhead(base.months)}`} />
        <Metric label="Months saved" tone={months > 0 && !never ? 'good' : undefined} value={never || neverPaid(base) ? '—' : <AnimatedNumber value={months} format={n => String(Math.round(n))} />} sub={never ? 'Payments do not cover the interest' : `${plural(sim.months, 'month')} instead of ${base.months}`} />
        <Metric label="Interest avoided" tone={interest > 0 && !never ? 'good' : undefined} value={never || neverPaid(base) ? '—' : <AnimatedNumber value={interest} format={f} />} sub={never ? '' : `${f(sim.interestPaid)} instead of ${f(base.interestPaid)}`} />
      </MetricTray>
      {!never && !neverPaid(base) && (
        <ChartCard label="Total balance" value={monthAhead(sim.months)} sub="The month the balance reaches zero"
          right={<div className="flex gap-4 text-xs text-muted-foreground"><LegendKey color="var(--chart)">What-if</LegendKey><LegendKey color="var(--chart-soft)">Current plan</LegendKey></div>}>
          <div className="pb-1"><Curve data={data} names={['What-if', 'Current plan']} currency={currency} /></div>
        </ChartCard>
      )}
    </div>
  )
}
