import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { Button, Card, Chip, Dialog, Field, Input, Select } from '../ui'
import { debtsNow, owed, planFromNow, planProgress, type Progress } from '../../lib/debts'
import { fmt, fullDate, monthLabel, todayISO } from '../../lib/money'
import { deleteWithUndo } from '../../lib/undo'
import type { Payment } from '../../types'

/** The debts as entered, as they stand today (`now`, with `owedNow` in total), and the payments. */
export function useDebts() {
  const debts = useStore(s => s.debts)
  const payments = useStore(s => s.payments)
  const currency = useStore(s => s.settings.currency)
  const now = useMemo(() => debtsNow(debts, payments), [debts, payments])
  return { debts, payments, currency, now, owedNow: now.reduce((s, d) => s + d.balance, 0) }
}
/** The payoff plan's settings as they apply from today: see `planFromNow`. */
export function usePlan() {
  const plan = useStore(s => s.plan)
  const payments = useStore(s => s.payments)
  return useMemo(() => planFromNow(plan, payments), [plan, payments])
}

/** Log a payment toward a debt, or edit one. `debtId` preselects the debt when adding. */
export function PaymentDialog({ payment, debtId, onClose }: { payment?: Payment; debtId?: string; onClose: () => void }) {
  const { debts, now, currency } = useDebts()
  const open = now.filter(d => d.balance > 0 || d.id === payment?.debtId)
  const [debt, setDebt] = useState(payment?.debtId ?? debtId ?? open[0]?.id ?? '')
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '')
  const [date, setDate] = useState(payment?.date ?? todayISO())
  const [tried, setTried] = useState(false)
  // The balance typed for a debt already holds everything paid before the day it was entered.
  const entered = debts.find(d => d.id === debt)?.startDate ?? ''
  const errs = {
    amount: Number(amount) > 0 ? undefined : 'Enter an amount greater than 0',
    date: !date || date > todayISO() ? 'Pick a valid date (not in the future)' : date < entered ? `This debt was entered on ${fullDate(entered)}. Pick that day or a later one` : undefined,
  }
  const save = () => {
    setTried(true)
    if (errs.amount || errs.date || !debt) return
    const st = useStore.getState(), data = { debtId: debt, amount: Number(amount), date }
    if (payment) st.patchIn('payments', payment.id, data); else st.addTo('payments', data)
    const after = useStore.getState(), d = after.debts.find(x => x.id === debt)
    if (d && owed(d, after.payments) <= 0) useUI.getState().showToast(`${d.name} is paid off`)
    onClose()
  }
  const left = now.find(d => d.id === debt)?.balance ?? 0
  return (
    <Dialog open onClose={onClose} title={payment ? 'Edit payment' : 'Log payment'}>
      <div className="space-y-5">
        <Field label="Debt" hint={`${fmt(left, currency)} owed today`}>
          <Select value={debt} onChange={e => setDebt(e.target.value)}>{(payment ? debts : open).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" error={tried ? errs.amount : undefined}><Input type="number" inputMode="decimal" min="0" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} autoFocus /></Field>
          <Field label="Date" error={tried ? errs.date : undefined}><Input type="date" min={entered} max={todayISO()} value={date} onChange={e => setDate(e.target.value)} /></Field>
        </div>
        <div className="flex items-center gap-2 [&>button]:max-sm:flex-1">
          {payment && <Button variant="destructive" onClick={() => { deleteWithUndo('payments', payment.id, 'Payment deleted'); onClose() }}>Delete</Button>}
          <span className="flex-1 max-sm:hidden" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>{payment ? 'Save payment' : 'Log payment'}</Button>
        </div>
      </div>
    </Dialog>
  )
}

const PROGRESS_CHIP: Record<Progress, { chip: string; tone: 'good' | 'outline' | 'warn' | 'bad' }> = {
  ahead: { chip: 'Ahead of plan', tone: 'good' }, on: { chip: 'On plan', tone: 'outline' }, due: { chip: 'On plan', tone: 'outline' }, behind: { chip: 'Behind plan', tone: 'bad' },
}
/** Where the customer stands against the payoff plan: the two balances and the difference, as numbers. */
export function PlanProgress({ onLog }: { onLog?: () => void }) {
  const { debts, payments, currency } = useDebts()
  const plan = useStore(s => s.plan)
  const p = useMemo(() => planProgress(debts, payments, plan), [debts, payments, plan])
  if (!p) return null
  const f = (n: number) => fmt(n, currency), month = monthLabel(todayISO().slice(0, 7))
  const line = p.state === 'ahead' ? `${f(p.by)} less than the plan expected.`
    : p.state === 'behind' ? `${f(p.by)} more than the plan allows before this month's payment.`
      : p.state === 'due' ? `${f(p.by)} still to pay in ${month} to stay on plan.` : 'Exactly what the plan expected.'
  return (
    <Card>
      <div className="p-4 sm:p-5 flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 basis-64 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-foreground"><Chip tone={PROGRESS_CHIP[p.state].tone}>{PROGRESS_CHIP[p.state].chip}</Chip><span>{line}</span></div>
          <p className="mt-2 text-muted-foreground leading-5 tabular-nums">You owe {f(p.real)}. The plan expected {f(p.expected)} by the end of {month}, counted from {monthLabel(p.since)}.</p>
        </div>
        {onLog && p.real > 0 && <Button className="max-sm:w-full" onClick={onLog}>Log payment</Button>}
      </div>
    </Card>
  )
}
