import { useMemo } from 'react'
import { CreditCardIcon, PlusIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { hasModule } from '../lib/access'
import { MODULES } from '../lib/modules'
import { paymentSchedule } from '../lib/calc'
import { currentMonthKey, fmt, shiftMonth } from '../lib/money'
import { Button, Card, CardHeader, Chip, Empty, PageHeader } from '../components/ui'
import Locked from '../components/Locked'
import DebtPlanner from '../components/pro/DebtPlanner'
import { useDebtPrefs } from '../components/debts/prefs'

const MAX_ROWS = 120

function LockedDebts() {
  return (
    <Locked module={MODULES.debts} icon={<CreditCardIcon />} subtitle="Snowball pays the smallest balance first. Avalanche pays the highest rate first.">
      <DebtPlanner />
    </Locked>
  )
}

function Schedule() {
  const debts = useStore(s => s.debts)
  const currency = useStore(s => s.settings.currency)
  const setTab = useUI(s => s.setTab)
  const { extra, method } = useDebtPrefs()
  const rows = useMemo(() => paymentSchedule(debts, extra, method), [debts, extra, method])
  const f = (n: number) => fmt(n, currency)
  const cur = currentMonthKey()
  const label = (i: number) => new Date(shiftMonth(cur, i) + '-01T00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const grid = { gridTemplateColumns: `minmax(96px,1fr) repeat(${debts.length + 1}, minmax(96px,1fr))` }

  return (
    <>
      <PageHeader title="Schedule" subtitle="Month by month until the last payment." />
      {debts.length === 0 ? (
        <Card><Empty title="No debts added" text="Add your debts to see the month-by-month schedule." action={<Button variant="primary" onClick={() => setTab('debts')}><PlusIcon />Add debt</Button>} /></Card>
      ) : (
        <Card>
          <CardHeader title="Payment schedule" />
          <div className="overflow-x-auto">
            <div className="min-w-max sm:min-w-0">
              <div className="grid items-center h-11 px-4 text-xs text-muted-foreground border-b border-border" style={grid}>
                <span>Month</span>
                {debts.map(d => <span key={d.id} className="text-right truncate pl-2">{d.name}</span>)}
                <span className="text-right">Total</span>
              </div>
              {rows.slice(0, MAX_ROWS).map(r => (
                <div key={r.month} className="grid items-center h-11 px-4 text-sm tabular-nums border-b border-border last:border-b-0" style={grid}>
                  <span>{label(r.month)}</span>
                  {debts.map(d => (
                    <span key={d.id} className="text-right flex items-center justify-end gap-2 pl-2">
                      {r.paidOff.includes(d.id) && <Chip tone="good">Paid off</Chip>}
                      {r.pays[d.id] === undefined ? <span className="text-muted-foreground">—</span> : f(r.pays[d.id])}
                    </span>
                  ))}
                  <span className="text-right">{f(r.total)}</span>
                </div>
              ))}
            </div>
          </div>
          {rows.length > MAX_ROWS && <p className="text-xs text-muted-foreground px-4 py-3 border-t border-border">Showing the first {MAX_ROWS} of {rows.length} months.</p>}
        </Card>
      )}
    </>
  )
}

export default function Debts() {
  const tab = useUI(s => s.tab)
  const unlocked = useStore(s => hasModule(s.settings, 'debts'))
  if (!unlocked) return <LockedDebts />
  if (tab === 'debts-schedule') return <Schedule />
  return (
    <>
      <PageHeader title="Planner" subtitle="Snowball pays the smallest balance first. Avalanche pays the highest rate first." />
      <DebtPlanner />
    </>
  )
}
