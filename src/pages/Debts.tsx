import { useMemo } from 'react'
import { useUI } from '../ui-state'
import { neverPaid, simulate } from '../lib/debts'
import { fmt, monthAhead, plural } from '../lib/money'
import { AnimatedNumber, Button, Card, CardHeader, Chip, Empty, Metric, MetricTray, TableHead } from '../components/ui'
import { AddonPage, type Screens } from '../components/Locked'
import DebtPlanner from '../components/pro/DebtPlanner'
import WhatIf from '../components/pro/WhatIf'
import Payments from '../components/pro/Payments'
import { useDebts } from '../components/debts/shared'

const MAX_ROWS = 120

function MonthByMonth() {
  const { now, plan, currency } = useDebts()
  const debts = useMemo(() => now.filter(d => d.balance > 0), [now])
  const { extra, method } = plan
  const sim = useMemo(() => simulate(debts, plan), [debts, plan])
  const rows = sim.rows, never = neverPaid(sim)
  const sum = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows])
  const f = (n: number) => fmt(n, currency)
  const shown = rows.slice(0, MAX_ROWS)
  const cell = (r: typeof rows[number], id: string) => (
    <>
      {r.paidOff.includes(id) && <Chip tone="good">Paid off</Chip>}
      {r.pays[id] === undefined ? <span className="text-muted-foreground">—</span> : f(r.pays[id])}
    </>
  )

  if (debts.length === 0) {
    return <Card><Empty title="No debts to pay" text="The months appear here once the payoff plan has at least one debt." action={<Button variant="primary" className="max-sm:px-4" onClick={() => useUI.getState().setTab('debts')}>Open payoff plan</Button>} /></Card>
  }
  return (
    <div className="space-y-6">
      <MetricTray>
        <Metric label="First month" value={<AnimatedNumber value={rows[0]?.total ?? 0} format={f} />} sub={monthAhead(1)} />
        <Metric label="Total to pay" value={<AnimatedNumber value={sum} format={f} />} sub={`Over ${plural(rows.length, 'month')}`} />
        <Metric label="Last month" tone={never ? 'bad' : undefined} value={never ? 'Not reached' : monthAhead(rows.length)} sub={never ? 'Payments do not cover the interest' : `In ${plural(rows.length, 'month')}`} />
      </MetricTray>
      <Card>
        <CardHeader title="Month by month"
          right={<span className="text-xs text-muted-foreground">{method === 'avalanche' ? 'Avalanche' : 'Snowball'}{extra > 0 && ` · ${f(extra)} extra`}</span>} />
        <div className="max-md:hidden overflow-x-auto">
          <div className="min-w-fit tabular-nums">
            <TableHead>
              <span className="w-24 shrink-0">Month</span>
              {debts.map(d => <span key={d.id} className="flex-1 min-w-28 text-right truncate">{d.name}</span>)}
              <span className="w-28 shrink-0 text-right">Total</span>
            </TableHead>
            {shown.map(r => (
              <div key={r.month} className="h-11 px-4 flex items-center gap-3 text-sm border-b border-border last:border-b-0">
                <span className="w-24 shrink-0 text-muted-foreground">{monthAhead(r.month)}</span>
                {debts.map(d => <span key={d.id} className="flex-1 min-w-28 flex items-center justify-end gap-2">{cell(r, d.id)}</span>)}
                <span className="w-28 shrink-0 text-right">{f(r.total)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="md:hidden tabular-nums">
          {shown.map(r => (
            <div key={r.month} className="px-4 py-3 text-sm border-b border-border last:border-b-0">
              <div className="flex justify-between gap-3"><span>{monthAhead(r.month)}</span><span>{f(r.total)}</span></div>
              {debts.map(d => (
                <div key={d.id} className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="truncate">{d.name}</span>
                  <span className="flex items-center gap-2 shrink-0">{cell(r, d.id)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {rows.length > MAX_ROWS && <p className="text-xs text-muted-foreground px-4 py-3 border-t border-border">Showing the first {MAX_ROWS} of {rows.length} months.</p>}
      </Card>
    </div>
  )
}

const SCREENS: Screens = {
  debts: ['Payoff plan', 'Every debt in one plan: when each reaches zero, what it costs, and where you stand.', DebtPlanner],
  'debts-whatif': ['What-if', 'Try an extra amount or a one-off payment and see the new debt-free date before you commit.', WhatIf],
  'debts-payments': ['Payments', 'What you actually paid. Each payment lowers its debt and counts against the plan.', Payments],
  'debts-schedule': ['Month by month', 'What the payoff plan pays each month, until the last one.', MonthByMonth],
}

export default function Debts() {
  return <AddonPage kind="debts" screens={SCREENS} />
}
