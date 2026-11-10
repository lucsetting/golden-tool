import { useMemo, useState } from 'react'
import { PlusIcon } from '@heroicons/react/16/solid'
import { useUI } from '../../ui-state'
import { AnimatedNumber, Button, Card, CardHeader, Chip, Empty, Metric, MetricTray, Select, TableHead, TableRow } from '../ui'
import { currentMonthKey, dateLabel, fmt, monthKey, monthLabel, plural } from '../../lib/money'
import { PaymentDialog, PlanProgress, useDebts } from '../debts/shared'
import type { Payment } from '../../types'

/** What the customer actually paid: the standing against the plan, the totals, and the log, for all debts or one. */
export default function Payments() {
  const { debts, payments, currency, owedNow } = useDebts()
  const [only, setOnly] = useState('')
  const [dialog, setDialog] = useState<{ payment?: Payment } | null>(null)
  const name = useMemo(() => new Map(debts.map(d => [d.id, d.name])), [debts])
  const mine = useMemo(() => payments.filter(p => name.has(p.debtId)), [payments, name])
  const list = useMemo(() => mine.filter(p => !only || p.debtId === only).map((p, i) => ({ p, i })).sort((a, b) => b.p.date.localeCompare(a.p.date) || b.i - a.i).map(x => x.p), [mine, only])
  const paid = mine.filter(p => !p.correction), cur = currentMonthKey()
  const sum = (ps: Payment[]) => ps.reduce((s, p) => s + p.amount, 0)
  const f = (n: number) => fmt(n, currency)
  const log = <Button variant="primary" size="sm" className="relative after:absolute after:-inset-1.5" onClick={() => setDialog({})}><PlusIcon /><span>Log payment</span></Button>

  if (debts.length === 0) {
    return <Card><Empty title="No debts yet" text="Payments are logged against the debts in the payoff plan." action={<Button variant="primary" className="max-sm:px-4" onClick={() => useUI.getState().setTab('debts')}>Open payoff plan</Button>} /></Card>
  }
  return (
    <div className="space-y-6">
      <PlanProgress />
      <MetricTray>
        <Metric label="Paid so far" value={<AnimatedNumber value={sum(paid)} format={f} />} sub={plural(paid.length, 'payment')} />
        <Metric label={`Paid in ${monthLabel(cur, 'short')}`} value={<AnimatedNumber value={sum(paid.filter(p => monthKey(p.date) === cur))} format={f} />} sub="This month" />
        <Metric label="Owed today" value={<AnimatedNumber value={owedNow} format={f} />} sub={plural(debts.length, 'debt')} />
      </MetricTray>
      <Card>
        <CardHeader title="Payments" right={owedNow > 0 && log} />
        {debts.length > 1 && mine.length > 0 && (
          <div className="p-3 border-b border-border sm:max-w-xs">
            <Select value={only} onChange={e => setOnly(e.target.value)} aria-label="Show payments for">
              <option value="">All debts</option>
              {debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
        )}
        {list.length === 0 ? (
          <Empty title={only ? 'No payments to this debt yet' : 'No payments logged yet'} text="Log each payment you make. The debt's balance follows, and this page shows whether you are ahead of or behind the payoff plan." action={owedNow > 0 && <Button variant="primary" className="max-sm:px-4" onClick={() => setDialog({})}><PlusIcon /><span>Log payment</span></Button>} />
        ) : (
          <>
            <TableHead className="max-sm:hidden"><span className="flex-1">Debt</span><span className="w-32">Date</span><span className="w-28 text-right">Amount</span></TableHead>
            {list.map(p => {
              const row = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="text-foreground truncate">{name.get(p.debtId)}</span>{p.correction && <Chip>Balance correction</Chip>}</span>
                    <span className="block sm:hidden text-xs text-muted-foreground mt-0.5">{dateLabel(p.date)}</span>
                  </span>
                  <span className="max-sm:hidden w-32 text-muted-foreground">{dateLabel(p.date)}</span>
                  <span className="sm:w-28 text-right text-foreground tabular-nums">{p.correction ? (p.amount > 0 ? '−' : '+') + f(Math.abs(p.amount)) : f(p.amount)}</span>
                </>
              )
              // A correction is not a payment: it has no amount to edit, only the balance it set.
              return p.correction ? <TableRow key={p.id}>{row}</TableRow> : <TableRow key={p.id} onClick={() => setDialog({ payment: p })}>{row}</TableRow>
            })}
          </>
        )}
      </Card>
      {dialog && <PaymentDialog payment={dialog.payment} onClose={() => setDialog(null)} />}
    </div>
  )
}
