import { useMemo, useState } from 'react'
import { BanknotesIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { AnimatedNumber, Button, Card, CardHeader, Chip, Dialog, Empty, Field, IconButton, Input, Metric, MetricTray, Segmented, TableHead, TableRow } from '../ui'
import ChartCard from '../charts/ChartCard'
import Curve from '../charts/Curve'
import { fmt, monthAhead, monthLabel, plural, todayISO } from '../../lib/money'
import { STRATEGY, balanceEdit, minimumOnly, neverPaid, simulate, type DebtLike } from '../../lib/debts'
import { deleteWithUndo } from '../../lib/undo'
import { PaymentDialog, PlanProgress, useDebts, usePlan } from '../debts/shared'

/** Add a debt, or edit one. The balance field is what is owed today; what a change to it becomes is `balanceEdit`. */
function DebtForm({ debt, onClose }: { debt?: DebtLike; onClose: () => void }) {
  const [name, setName] = useState(debt?.name ?? '')
  const [balance, setBalance] = useState(debt ? String(debt.balance) : '')
  const [apr, setApr] = useState(debt ? String(debt.apr) : '')
  const [min, setMin] = useState(debt ? String(debt.minPayment) : '')
  const ok = name.trim() && Number(min) > 0 && Number(apr) >= 0 && apr !== '' && (debt ? Number(balance) >= 0 && balance !== '' : Number(balance) > 0)
  const save = () => {
    const st = useStore.getState(), today = todayISO(), fields = { name: name.trim(), apr: Number(apr), minPayment: Number(min) }
    if (!debt) st.addTo('debts', { ...fields, balance: Number(balance), startDate: today })
    else {
      st.patchIn('debts', debt.id, fields) // first, because a new APR changes what is owed
      const after = useStore.getState(), edit = balanceEdit(after.debts.find(d => d.id === debt.id)!, after.payments, Number(balance))
      if (edit && 'balance' in edit) st.patchIn('debts', debt.id, edit)
      else if (edit) st.addTo('payments', { debtId: debt.id, amount: edit.correction, date: today, correction: true })
    }
    onClose()
  }
  return (
    <div className="space-y-5">
      <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Credit card" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={debt ? 'Balance today' : 'Balance'}><Input type="number" inputMode="decimal" value={balance} onChange={e => setBalance(e.target.value)} /></Field>
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
  const { now: debts, currency, owedNow } = useDebts()
  const plan = usePlan()
  const [sheet, setSheet] = useState<{ debt?: DebtLike } | null>(null)
  const [paying, setPaying] = useState<string | null>(null) // debt id, or '' for no debt picked
  const { sim, base, snow, ava } = useMemo(() => ({
    sim: simulate(debts, plan), base: simulate(debts, { ...plan, extra: 0, oneOff: undefined }),
    snow: simulate(debts, { ...plan, method: 'snowball' }), ava: simulate(debts, { ...plan, method: 'avalanche' }),
  }), [debts, plan])
  const capped = neverPaid(sim)
  const saved = Math.max(0, base.interestPaid - sim.interestPaid)
  const f = (n: number) => fmt(n, currency), f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const when = (s: { months: number }) => (neverPaid(s) ? 'Not reached' : monthAhead(s.months))
  const ends = (s: typeof sim, d: DebtLike) => (s.payoffMonth.has(d.id) ? monthAhead(s.payoffMonth.get(d.id)!) : undefined)
  const paidOff = (d: DebtLike) => (d.balance <= 0 ? 'Paid' : ends(sim, d) ?? 'Not reached')
  const add = <Button variant="primary" size="sm" className="relative after:absolute after:-inset-1.5" onClick={() => setSheet({})}><PlusIcon /><span>Add debt</span></Button>
  const oneOff = plan.oneOff
  const curve = useMemo(() => [{ x: 0, label: 'Today', value: owedNow }, ...sim.rows.map(r => ({ x: r.month, label: monthAhead(r.month), value: r.balance }))], [sim, owedNow])
  const open = useMemo(() => debts.filter(d => d.balance > 0), [debts])
  const paidIn = open.filter(d => sim.payoffMonth.has(d.id)).map(d => ({ d, month: sim.payoffMonth.get(d.id)! })).sort((a, b) => a.month - b.month)
  const alone = useMemo(() => new Map(open.map(d => [d.id, minimumOnly(d)])), [open])
  const gap = Math.round((snow.interestPaid - ava.interestPaid) * 100) / 100

  return (
    <section className="space-y-6">
      {debts.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <Segmented value={plan.method} onChange={method => useStore.getState().setPlan({ method })} options={[{ value: 'snowball', label: STRATEGY.snowball }, { value: 'avalanche', label: STRATEGY.avalanche }]}
              className="max-sm:flex max-sm:w-full max-sm:[&>button]:flex-1" />
            <label className="flex items-center justify-between gap-3 text-sm text-muted-foreground max-sm:w-full">
              Extra per month
              <Input type="number" inputMode="decimal" min={0} className="w-28! tabular-nums" value={plan.extra || ''} onChange={e => useStore.getState().setPlan({ extra: Math.max(0, Number(e.target.value) || 0) })} placeholder="0" />
            </label>
            {oneOff && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground max-sm:w-full max-sm:justify-between">
                Plus {f(oneOff.amount)} once in {monthLabel(oneOff.month, 'short')}
                <Button size="sm" onClick={() => useStore.getState().setPlan({ oneOff: undefined })}>Remove</Button>
              </span>
            )}
          </div>
          <PlanProgress onLog={() => setPaying('')} />
          <MetricTray>
            <Metric label="Debt-free in" tone={capped ? 'bad' : undefined}
              value={capped ? 'Not reached' : <AnimatedNumber value={sim.months} format={n => plural(Math.round(n), 'month')} />}
              sub={capped ? 'Payments do not cover the interest' : monthAhead(sim.months)} />
            <Metric label="Interest paid" value={<AnimatedNumber value={sim.interestPaid} format={f} />} sub={`On ${f(owedNow)} owed`} />
            <Metric label="Interest saved" tone={saved > 0 ? 'good' : undefined} value={<AnimatedNumber value={saved} format={f} />} sub={plan.extra > 0 || oneOff ? 'Against the minimum payments alone' : 'No extra payment set'} />
          </MetricTray>
          {open.length > 0 && !capped && (
            <ChartCard label="Total balance" value={<AnimatedNumber value={owedNow} format={f0} />} sub={`Reaches zero in ${monthAhead(sim.months)}`}>
              <div className="pb-1"><Curve data={curve} names={['Balance']} currency={currency} dots={paidIn.filter(e => e.month > 0).map(e => ({ x: e.month, y: sim.rows[e.month - 1].balance }))} /></div>
              <ul className="px-5 py-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted-foreground border-t border-border">
                {paidIn.map(e => <li key={e.d.id} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border-2" style={{ borderColor: 'var(--chart)' }} />{e.d.name} paid off in {monthAhead(e.month)}</li>)}
              </ul>
            </ChartCard>
          )}
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
              <span className="w-24" />
            </TableHead>
            {debts.map(d => (
              <TableRow key={d.id} className="tabular-nums">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="truncate text-foreground">{d.name}</span>{d.balance <= 0 && <Chip tone="good">Paid</Chip>}</div>
                  <div className="xl:hidden text-xs text-muted-foreground mt-1 leading-5">
                    {d.apr}% APR · minimum {f(d.minPayment)}{d.balance > 0 && <><br />Paid off: {paidOff(d)}</>}
                  </div>
                </div>
                <span className="max-xl:hidden w-20 text-right text-muted-foreground">{d.apr}%</span>
                <span className="max-xl:hidden w-36 text-right text-muted-foreground">{f(d.minPayment)}</span>
                <span className="max-xl:hidden w-28 text-right text-muted-foreground">{paidOff(d)}</span>
                <span className="max-xl:hidden w-32 text-right">{f(d.balance)}</span>
                <div className="flex shrink-0 max-xl:flex-col max-xl:items-end xl:w-24 xl:justify-end">
                  <span className="xl:hidden">{f(d.balance)}</span>
                  <div className="flex max-sm:-mr-2">
                    {d.balance > 0 && <IconButton size="sm" label={`Log a payment to ${d.name}`} onClick={() => setPaying(d.id)}><BanknotesIcon /></IconButton>}
                    <IconButton size="sm" label={`Edit ${d.name}`} onClick={() => setSheet({ debt: d })}><PencilIcon /></IconButton>
                    <IconButton size="sm" label={`Delete ${d.name}`} onClick={() => deleteWithUndo('debts', d.id, 'Debt deleted')}><TrashIcon /></IconButton>
                  </div>
                </div>
              </TableRow>
            ))}
          </>
        )}
      </Card>

      {open.length > 0 && (
        <>
          <Card>
            <CardHeader title="Strategies side by side" right={<span className="text-xs text-muted-foreground max-sm:hidden">Same payments, different order</span>} />
            <div className="grid sm:grid-cols-2 sm:divide-x divide-border max-sm:divide-y">
              {([['snowball', 'Smallest balance first', snow], ['avalanche', 'Highest rate first', ava]] as const).map(([key, rule, s]) => (
                <div key={key} className="p-4 sm:p-5 text-sm">
                  <div className="flex items-center gap-2 text-foreground">{STRATEGY[key]}{plan.method === key && <Chip tone="outline">Your plan</Chip>}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{rule}</div>
                  <dl className="mt-4 space-y-2 tabular-nums">
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Debt-free</dt><dd className={neverPaid(s) ? 'text-destructive' : 'text-foreground'}>{when(s)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Total interest</dt><dd className="text-foreground">{neverPaid(s) ? '—' : f(s.interestPaid)}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
            {!neverPaid(snow) && !neverPaid(ava) && (
              <p className="px-4 sm:px-5 py-3 text-sm text-muted-foreground border-t border-border tabular-nums">
                {gap > 0 ? `Avalanche costs ${f(gap)} less in interest${snow.months !== ava.months ? ` and ends ${plural(Math.abs(snow.months - ava.months), 'month')} ${ava.months < snow.months ? 'sooner' : 'later'}` : ''}.` : 'Both strategies cost the same with these debts.'}
              </p>
            )}
          </Card>

          <Card>
            <CardHeader title="Paying only the minimum" right={<span className="text-xs text-muted-foreground max-sm:hidden">Each debt alone, against the plan</span>} />
            <TableHead className="max-sm:hidden">
              <span className="flex-1">Debt</span>
              <span className="w-56 text-right">Minimum only</span>
              <span className="w-56 text-right">In your plan</span>
            </TableHead>
            {open.map(d => {
              const m = alone.get(d.id)!, inPlan = ends(sim, d)
              const minimum = m.never ? 'Never paid off' : `${monthAhead(m.months)} · ${f(m.interest)} interest`
              const planned = inPlan ? `${inPlan} · ${f(sim.interestBy.get(d.id) ?? 0)} interest` : 'Not reached'
              return (
                <TableRow key={d.id} className="tabular-nums max-sm:flex-col max-sm:items-stretch max-sm:gap-1.5">
                  <span className="flex-1 min-w-0 truncate text-foreground">{d.name}</span>
                  <span className={`sm:w-56 sm:text-right max-sm:flex max-sm:justify-between max-sm:text-xs ${m.never ? 'text-destructive' : 'text-muted-foreground'}`}><span className="sm:hidden text-muted-foreground">Minimum only</span>{minimum}</span>
                  <span className="sm:w-56 sm:text-right max-sm:flex max-sm:justify-between max-sm:text-xs"><span className="sm:hidden text-muted-foreground">In your plan</span>{planned}</span>
                </TableRow>
              )
            })}
          </Card>
        </>
      )}

      <Dialog open={!!sheet} onClose={() => setSheet(null)} title={sheet?.debt ? 'Edit debt' : 'Add debt'}>
        {sheet && <DebtForm debt={sheet.debt} onClose={() => setSheet(null)} />}
      </Dialog>
      {paying !== null && <PaymentDialog debtId={paying || undefined} onClose={() => setPaying(null)} />}
    </section>
  )
}
