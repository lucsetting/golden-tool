import { useMemo, useState } from 'react'
import { ArrowDownLeftIcon, ArrowUpRightIcon, PlusIcon, ScaleIcon, BanknotesIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { cashFlow, cashFlowHistory, total } from '../lib/calc'
import { dateLabel, fmt, monthKey, monthLabel, todayISO } from '../lib/money'
import { deleteWithUndo } from '../lib/undo'
import type { Income } from '../types'
import { parseAmount } from '../components/ExpenseSheet'
import { AnimatedNumber, Button, Card, CardHeader, Chip, Dialog, Empty, Field, Input, Metric, MetricTray, PageHeader, Switch, TableHead, TableRow } from '../components/ui'
import MonthPicker from '../components/MonthPicker'
import ChartCard from '../components/charts/ChartCard'
import FlowBars from '../components/charts/FlowBars'

const Key = ({ color, children }: { color: string; children: string }) => (
  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{children}</span>
)

/** Add or edit one income. `income` undefined = adding. */
function IncomeDialog({ income, onClose }: { income?: Income; onClose: () => void }) {
  const sources = useStore(s => [...new Set(s.incomes.map(i => i.source))].slice(0, 20).join('\n'))
  const [amount, setAmount] = useState(income ? String(income.amount) : '')
  const [source, setSource] = useState(income?.source ?? '')
  const [date, setDate] = useState(income?.date ?? todayISO())
  const [repeat, setRepeat] = useState(!!income?.repeat)
  const [tried, setTried] = useState(false)
  const today = todayISO()
  const errs = {
    amount: parseAmount(amount) > 0 ? undefined : 'Enter an amount greater than 0',
    date: date && date <= today ? undefined : 'Pick a valid date (not in the future)',
  }
  const save = () => {
    setTried(true)
    if (errs.amount || errs.date) return
    const data = { amount: parseAmount(amount), source: source.trim() || 'Income', date, repeat: repeat || undefined }
    if (income) useStore.getState().updateIncome(income.id, data); else useStore.getState().addIncome(data)
    useUI.getState().showToast(repeat && !income ? 'Saved as monthly' : 'Saved')
    onClose()
  }
  return (
    <Dialog open onClose={onClose} title={income ? 'Edit income' : 'Add income'}>
      <form noValidate className="flex flex-col gap-5" onSubmit={e => { e.preventDefault(); save() }}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount" error={tried ? errs.amount : undefined}><Input inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} autoFocus /></Field>
          <Field label="Date" error={tried ? errs.date : undefined}><Input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} /></Field>
        </div>
        <Field label="Source">
          <Input list="income-sources" value={source} onChange={e => setSource(e.target.value)} placeholder="Salary, freelance, refund…" autoComplete="off" />
          <datalist id="income-sources">{sources.split('\n').filter(Boolean).map(s => <option key={s} value={s} />)}</datalist>
        </Field>
        {income?.repeatOf
          ? <p className="text-sm text-muted-foreground">Posted from a monthly income. Changes here stay in this month.</p>
          : (
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
              <span>
                <span className="block text-sm text-foreground">Repeat monthly</span>
                <span className="block text-sm text-muted-foreground mt-0.5">Added again on day {Number(date.slice(8)) || 1} of every month</span>
              </span>
              <Switch checked={repeat} onChange={setRepeat} label="Repeat monthly" />
            </label>
          )}
        <div className="flex items-center justify-end gap-2 pt-2">
          {income && <Button type="button" variant="destructive" className="mr-auto" onClick={() => { deleteWithUndo('incomes', income.id); onClose() }}>Delete</Button>}
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="max-sm:flex-1">Save</Button>
        </div>
      </form>
    </Dialog>
  )
}

export default function CashFlow() {
  const month = useUI(s => s.month)
  const incomes = useStore(s => s.incomes)
  const expenses = useStore(s => s.expenses)
  const currency = useStore(s => s.settings.currency)
  const [edit, setEdit] = useState<string | null>(null) // income id, or 'new'
  const m0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })

  const cf = useMemo(() => cashFlow(incomes, expenses, month), [incomes, expenses, month])
  const history = useMemo(() => cashFlowHistory(incomes, expenses, 6, month).map(h => ({ ...h, label: monthLabel(h.month, 'short').split(' ')[0] })), [incomes, expenses, month])
  const list = useMemo(() => incomes.filter(i => monthKey(i.date) === month).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), [incomes, month])
  const editing = incomes.find(i => i.id === edit)
  const add = (cls?: string) => <Button variant="primary" className={cls} onClick={() => setEdit('new')}><PlusIcon />Add income</Button>
  const subtitle = cf.income <= 0 ? 'Add your income to see what is left after expenses.'
    : cf.net >= 0 ? `${m0(cf.net)} of the ${m0(cf.income)} that came in is left after expenses.` : `Expenses are ${m0(-cf.net)} above the ${m0(cf.income)} that came in.`

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Cash flow" subtitle={subtitle} actions={<><MonthPicker />{add()}</>} />

      <MetricTray cols={4}>
        <Metric label="Income" icon={<ArrowDownLeftIcon />} value={<AnimatedNumber value={cf.income} format={m0} />} sub={`${list.length} ${list.length === 1 ? 'entry' : 'entries'}`} />
        <Metric label="Expenses" icon={<ArrowUpRightIcon />} value={<AnimatedNumber value={cf.spent} format={m0} />} sub={cf.income > 0 ? `${Math.round((cf.spent / cf.income) * 100)}% of income` : monthLabel(month)} />
        <Metric label="Cash flow" icon={<BanknotesIcon />} tone={cf.income > 0 && cf.net < 0 ? 'bad' : undefined}
          value={cf.income > 0 ? <AnimatedNumber value={cf.net} format={m0} /> : '—'} sub="Income minus expenses" />
        <Metric label="Savings rate" icon={<ScaleIcon />} tone={cf.rate !== null && cf.rate < 0 ? 'bad' : undefined}
          value={cf.rate === null ? '—' : `${cf.rate}%`} sub={cf.rate === null ? 'No income recorded' : 'Share of income left'} />
      </MetricTray>

      <ChartCard label="Income and expenses" value={history.some(h => h.income > 0) ? <AnimatedNumber value={total(history.map(h => ({ amount: h.net })))} format={m0} /> : '—'}
        sub={`Cash flow, ${monthLabel(history[0].month, 'short')} to ${monthLabel(month, 'short')}`}
        right={<div className="flex gap-4 text-xs text-muted-foreground"><Key color="var(--chart-soft)">Income</Key><Key color="var(--chart)">Expenses</Key></div>}>
        <div className="px-2 pb-2"><FlowBars data={history} currency={currency} /></div>
      </ChartCard>

      <Card>
        <CardHeader title="Income" icon={<ArrowDownLeftIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
          right={list.length > 0 && <span className="text-sm text-muted-foreground tabular-nums">{list.length} · {fmt(cf.income, currency)}</span>} />
        {list.length === 0
          ? <Empty title={`No income in ${monthLabel(month)}`} text="Add what came in and this page shows your cash flow and savings rate. A monthly income adds itself." action={add()} />
          : (
            <>
              <TableHead className="max-sm:hidden"><span className="flex-1">Source</span><span className="w-28">Date</span><span className="w-28 text-right">Amount</span></TableHead>
              {list.map(i => (
                <TableRow key={i.id} onClick={() => setEdit(i.id)}>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="sr-only">Edit </span><span className="text-foreground truncate">{i.source}</span>{(i.repeat || i.repeatOf) && <Chip>Monthly</Chip>}</span>
                    <span className="block sm:hidden text-xs text-muted-foreground mt-0.5">{dateLabel(i.date)}</span>
                  </span>
                  <span className="max-sm:hidden w-28 text-muted-foreground">{dateLabel(i.date)}</span>
                  <span className="sm:w-28 text-right text-foreground tabular-nums">{fmt(i.amount, currency)}</span>
                </TableRow>
              ))}
            </>
          )}
      </Card>

      {edit && <IncomeDialog key={edit} income={editing} onClose={() => setEdit(null)} />}
    </div>
  )
}
