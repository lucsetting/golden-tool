import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { AnimatedNumber, Button, Card, CardHeader, Dialog, Empty, Field, IconButton, Input, Metric, MetricTray, Segmented, TableHead, TableRow } from '../ui'
import { currentMonthKey, fmt, monthLabel, shiftMonth } from '../../lib/money'
import { payoffPlan } from '../../lib/calc'
import { deleteWithUndo } from '../../lib/undo'
import { useDebtPrefs } from '../debts/prefs'
import type { Debt } from '../../types'

const monthAhead = (n: number) => monthLabel(shiftMonth(currentMonthKey(), n), 'short')

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
      <Field label="Minimum payment per month"><Input type="number" inputMode="decimal" value={min} onChange={e => setMin(e.target.value)} /></Field>
      <div className="flex justify-end gap-2 [&>button]:max-sm:flex-1">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!ok} onClick={save}>{debt ? 'Save debt' : 'Add debt'}</Button>
      </div>
    </div>
  )
}

export default function DebtPlanner() {
  const debts = useStore(s => s.debts)
  const currency = useStore(s => s.settings.currency)
  const extra = useDebtPrefs(s => s.extra)
  const method = useDebtPrefs(s => s.method)
  const [sheet, setSheet] = useState<{ debt?: Debt } | null>(null)
  const plan = useMemo(() => payoffPlan(debts, extra, method), [debts, extra, method])
  const base = useMemo(() => payoffPlan(debts, 0, method), [debts, method])
  const capped = plan.months >= 600
  const saved = Math.max(0, base.interestPaid - plan.interestPaid)
  const owed = debts.reduce((s, d) => s + d.balance, 0)
  const f = (n: number) => fmt(n, currency)
  const paidOff = (d: Debt) => plan.payoffMonth.has(d.id) ? monthAhead(plan.payoffMonth.get(d.id)!) : 'Not reached'
  const add = <Button variant="primary" size="sm" className="relative after:absolute after:-inset-1.5" onClick={() => setSheet({})}><PlusIcon /><span>Add debt</span></Button>

  return (
    <section className="space-y-6">
      {debts.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <Segmented value={method} onChange={useDebtPrefs.getState().setMethod} options={[{ value: 'snowball', label: 'Snowball' }, { value: 'avalanche', label: 'Avalanche' }]}
              className="max-sm:flex max-sm:w-full max-sm:[&>button]:flex-1" />
            <label className="flex items-center justify-between gap-3 text-sm text-muted-foreground max-sm:w-full">
              Extra per month
              <Input type="number" inputMode="decimal" min={0} className="w-28! tabular-nums" value={extra || ''} onChange={e => useDebtPrefs.getState().setExtra(Math.max(0, Number(e.target.value) || 0))} placeholder="0" />
            </label>
          </div>
          <MetricTray>
            <Metric label="Debt-free in" tone={capped ? 'bad' : undefined}
              value={capped ? 'Not reached' : <AnimatedNumber value={plan.months} format={n => `${Math.round(n)} month${Math.round(n) === 1 ? '' : 's'}`} />}
              sub={capped ? 'Payments do not cover the interest' : monthAhead(plan.months)} />
            <Metric label="Interest paid" value={<AnimatedNumber value={plan.interestPaid} format={f} />} sub={`On ${f(owed)} owed`} />
            <Metric label="Interest saved" tone={saved > 0 ? 'good' : undefined} value={<AnimatedNumber value={saved} format={f} />} sub={extra > 0 ? `With ${f(extra)} extra per month` : 'No extra payment set'} />
          </MetricTray>
        </>
      )}

      <Card>
        <CardHeader title="Debts" right={debts.length > 0 && add} />
        {debts.length === 0 ? (
          <Empty title="No debts yet" text="Add each debt with its balance, APR and minimum payment. The payoff plan shows the month each one reaches zero and the total interest." action={<Button variant="primary" className="max-sm:px-4" onClick={() => setSheet({})}><PlusIcon /><span>Add debt</span></Button>} />
        ) : (
          <>
            <TableHead className="max-xl:hidden">
              <span className="flex-1">Debt</span>
              <span className="w-20 text-right">APR</span>
              <span className="w-36 text-right">Minimum payment</span>
              <span className="w-28 text-right">Paid off</span>
              <span className="w-32 text-right">Balance</span>
              <span className="w-16" />
            </TableHead>
            {debts.map(d => (
              <TableRow key={d.id} className="tabular-nums">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-foreground">{d.name}</div>
                  <div className="xl:hidden text-xs text-muted-foreground mt-1 leading-5">
                    {d.apr}% APR · minimum {f(d.minPayment)}<br />Paid off: {paidOff(d)}
                  </div>
                </div>
                <span className="max-xl:hidden w-20 text-right text-muted-foreground">{d.apr}%</span>
                <span className="max-xl:hidden w-36 text-right text-muted-foreground">{f(d.minPayment)}</span>
                <span className="max-xl:hidden w-28 text-right text-muted-foreground">{paidOff(d)}</span>
                <span className="max-xl:hidden w-32 text-right">{f(d.balance)}</span>
                <div className="flex shrink-0 max-xl:flex-col max-xl:items-end xl:w-16 xl:justify-end">
                  <span className="xl:hidden">{f(d.balance)}</span>
                  <div className="flex max-sm:-mr-2">
                    <IconButton size="sm" label="Edit debt" onClick={() => setSheet({ debt: d })}><PencilIcon /></IconButton>
                    <IconButton size="sm" label="Delete debt" onClick={() => deleteWithUndo('debts', d.id, 'Debt deleted')}><TrashIcon /></IconButton>
                  </div>
                </div>
              </TableRow>
            ))}
          </>
        )}
      </Card>

      <Dialog open={!!sheet} onClose={() => setSheet(null)} title={sheet?.debt ? 'Edit debt' : 'Add debt'}>
        {sheet && <DebtForm debt={sheet.debt} onClose={() => setSheet(null)} />}
      </Dialog>
    </section>
  )
}
