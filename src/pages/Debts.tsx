import { useMemo } from 'react'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { hasModule } from '../lib/access'
import { MODULES } from '../lib/modules'
import { MAX_MONTHS, paymentSchedule } from '../lib/calc'
import { fmt, monthAhead } from '../lib/money'
import { AnimatedNumber, Button, Card, CardHeader, Chip, Empty, Metric, MetricTray, PageHeader, TableHead } from '../components/ui'
import Locked from '../components/Locked'
import DebtPlanner from '../components/pro/DebtPlanner'
import { useDebtPrefs } from '../components/debts/prefs'

const MAX_ROWS = 120

function MonthByMonth() {
  const debts = useStore(s => s.debts)
  const currency = useStore(s => s.settings.currency)
  const extra = useDebtPrefs(s => s.extra)
  const method = useDebtPrefs(s => s.method)
  const rows = useMemo(() => paymentSchedule(debts, extra, method), [debts, extra, method])
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
    return <Card><Empty title="No debts yet" text="The months appear here once the payoff plan has at least one debt." action={<Button variant="primary" className="max-sm:px-4" onClick={() => useUI.getState().setTab('debts')}>Open payoff plan</Button>} /></Card>
  }
  return (
    <div className="space-y-6">
      <MetricTray>
        <Metric label="First month" value={<AnimatedNumber value={rows[0]?.total ?? 0} format={f} />} sub={monthAhead(1)} />
        <Metric label="Total to pay" value={<AnimatedNumber value={sum} format={f} />} sub={`Over ${rows.length} month${rows.length === 1 ? '' : 's'}`} />
        <Metric label="Last month" tone={rows.length >= MAX_MONTHS ? 'bad' : undefined} value={rows.length >= MAX_MONTHS ? 'Not reached' : monthAhead(rows.length)} sub={rows.length >= MAX_MONTHS ? 'Payments do not cover the interest' : `In ${rows.length} month${rows.length === 1 ? '' : 's'}`} />
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

export default function Debts() {
  const byMonth = useUI(s => s.tab === 'debts-schedule')
  const unlocked = useStore(s => hasModule(s.settings, 'debts'))
  const body = byMonth ? <MonthByMonth /> : <DebtPlanner />
  return (
    <>
      {byMonth
        ? <PageHeader title="Month by month" subtitle="What the payoff plan pays each month, until the last one." />
        : <PageHeader title="Payoff plan" subtitle="Snowball pays the smallest balance first. Avalanche pays the highest rate first." />}
      {unlocked ? body : <Locked module={MODULES.debts}>{body}</Locked>}
    </>
  )
}
