import { useState } from 'react'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { Button, Card, CardHeader, Chip, Dialog, Empty, Field, IconButton, Input, Metric, MetricTray, Segmented } from '../ui'
import { fmt } from '../../lib/money'
import { payoffPlan } from '../../lib/calc'
import { useDebtPrefs } from '../debts/prefs'
import type { Debt } from '../../types'

function DebtForm({ debt, onClose }: { debt?: Debt; onClose: () => void }) {
  const { addDebt, updateDebt } = useStore.getState()
  const [name, setName] = useState(debt?.name ?? '')
  const [balance, setBalance] = useState(debt ? String(debt.balance) : '')
  const [apr, setApr] = useState(debt ? String(debt.apr) : '')
  const [min, setMin] = useState(debt ? String(debt.minPayment) : '')
  const ok = name.trim() && Number(balance) > 0 && Number(min) > 0 && Number(apr) >= 0 && apr !== ''
  const save = () => {
    const d = { name: name.trim(), balance: Number(balance), apr: Number(apr), minPayment: Number(min) }
    if (debt) updateDebt(debt.id, d); else addDebt(d)
    onClose()
  }
  return (
    <div className="space-y-5">
      <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Credit card" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Balance"><Input type="number" inputMode="decimal" value={balance} onChange={e => setBalance(e.target.value)} /></Field>
        <Field label="APR %"><Input type="number" inputMode="decimal" value={apr} onChange={e => setApr(e.target.value)} placeholder="24.99" /></Field>
      </div>
      <Field label="Minimum payment / month"><Input type="number" inputMode="decimal" value={min} onChange={e => setMin(e.target.value)} /></Field>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!ok} onClick={save}>{debt ? 'Save debt' : 'Add debt'}</Button>
      </div>
    </div>
  )
}

const when = (months: number) => {
  const d = new Date(); d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function DebtPlanner() {
  const debts = useStore(s => s.debts)
  const currency = useStore(s => s.settings.currency)
  const { deleteDebt } = useStore.getState()
  const { extra: ex, method, setExtra, setMethod } = useDebtPrefs()
  const [sheet, setSheet] = useState<{ debt?: Debt } | null>(null)
  const plan = debts.length ? payoffPlan(debts, ex, method) : null
  const base = debts.length ? payoffPlan(debts, 0, method) : null
  const capped = !!plan && plan.months >= 600
  const saved = plan && base ? Math.max(0, base.interestPaid - plan.interestPaid) : 0
  const f = (n: number) => fmt(n, currency)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={method} onChange={setMethod} options={[{ value: 'snowball', label: 'Snowball' }, { value: 'avalanche', label: 'Avalanche' }]} />
        <div className="relative w-40" title="Extra per month">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <Input type="number" inputMode="decimal" aria-label="Extra per month" className="pl-6" value={ex || ''} onChange={e => setExtra(Math.max(0, Number(e.target.value) || 0))} placeholder="Extra per month" />
        </div>
        <span className="flex-1" />
        <Button variant="primary" onClick={() => setSheet({})}><PlusIcon />Add debt</Button>
      </div>

      {plan && base && (
        <>
          <MetricTray className="sm:grid-cols-3">
            <Metric label="Debt-free in" value={capped ? '-' : `${plan.months} months`} sub={capped ? undefined : when(plan.months)} />
            <Metric label="Interest paid" value={f(plan.interestPaid)} />
            <Metric label="Interest saved" value={f(saved)} tone="good" sub="vs minimums only" />
          </MetricTray>
          {capped
            ? <p className="text-sm text-destructive">Payments don't cover the interest. Increase the payments to ever pay this off.</p>
            : <p className="text-sm text-muted-foreground">{method === 'avalanche' ? 'Avalanche pays the highest interest rate first, so it costs the least overall.' : 'Snowball pays the smallest balance first, so you get quick wins that keep you motivated.'}</p>}
        </>
      )}

      <Card>
        <CardHeader title="Debts" />
        {debts.length === 0 ? <Empty title="No debts added" text="Add your debts to see a payoff date and how much interest you can save." /> : debts.map(d => (
          <div key={d.id} className="h-[60px] px-4 flex items-center gap-3 border-b border-border last:border-b-0">
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{d.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{d.apr}% APR · min {f(d.minPayment)}</div>
            </div>
            <span className="text-sm tabular-nums">{f(d.balance)}</span>
            {plan?.payoffMonth.has(d.id) && <Chip className="hidden sm:inline-flex">paid off in {plan.payoffMonth.get(d.id)}mo</Chip>}
            <IconButton size="sm" label="Edit debt" onClick={() => setSheet({ debt: d })}><PencilIcon /></IconButton>
            <IconButton size="sm" label="Delete debt" onClick={() => confirm(`Delete "${d.name}"?`) && deleteDebt(d.id)}><TrashIcon /></IconButton>
          </div>
        ))}
      </Card>

      <Dialog open={!!sheet} onClose={() => setSheet(null)} title={sheet?.debt ? 'Edit debt' : 'Add debt'}>
        {sheet && <DebtForm debt={sheet.debt} onClose={() => setSheet(null)} />}
      </Dialog>
    </section>
  )
}
