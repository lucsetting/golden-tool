import { useMemo, useState } from 'react'
import { ArrowPathIcon, CalendarDaysIcon, ClockIcon, PlusIcon, TrashIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { OTHER, dayIn, dueSoon, subscriptions, total } from '../lib/calc'
import { currentMonthKey, dateLabel, daysInMonth, fmt, monthLabel, todayISO } from '../lib/money'
import { deleteWithUndo } from '../lib/undo'
import type { Category, Recurring } from '../types'
import { parseAmount } from '../components/ExpenseSheet'
import { AnimatedNumber, Button, Card, CardHeader, CategoryBadge, Chip, Dialog, Empty, Field, IconButton, Input, Metric, MetricTray, PageHeader, Segmented, Select, Switch, TableHead, TableRow, cx } from '../components/ui'

type View = 'list' | 'calendar' | 'subscriptions'

/** Add or edit one bill. `bill` undefined = adding. */
function BillDialog({ bill, onClose }: { bill?: Recurring; onClose: () => void }) {
  const categories = useStore(s => s.categories)
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '')
  const [name, setName] = useState(bill?.name ?? '')
  const [cat, setCat] = useState(bill?.categoryId ?? 'bills')
  const [day, setDay] = useState(String(bill?.dayOfMonth ?? Number(todayISO().slice(8))))
  const [subscription, setSubscription] = useState(!!bill?.subscription)
  const [tried, setTried] = useState(false)
  const errs = {
    amount: parseAmount(amount) > 0 ? undefined : 'Enter an amount greater than 0',
    name: name.trim() ? undefined : 'Enter a name',
    day: Number(day) >= 1 && Number(day) <= 31 ? undefined : 'Day must be 1 to 31',
  }
  const save = () => {
    setTried(true)
    if (errs.amount || errs.name || errs.day) return
    const data = { amount: parseAmount(amount), name: name.trim(), categoryId: cat, dayOfMonth: Math.round(Number(day)), subscription: subscription || undefined }
    if (bill) useStore.getState().updateRecurring(bill.id, data); else useStore.getState().addRecurring({ ...data, active: true })
    useUI.getState().showToast('Saved')
    onClose()
  }
  return (
    <Dialog open onClose={onClose} title={bill ? 'Edit bill' : 'Add bill'} description="Added as an expense on this day every month. In a shorter month, a late day falls on the last day.">
      <form noValidate className="flex flex-col gap-5" onSubmit={e => { e.preventDefault(); save() }}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount" error={tried ? errs.amount : undefined}><Input inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} autoFocus /></Field>
          <Field label="Day of month" error={tried ? errs.day : undefined}><Input type="number" inputMode="numeric" min={1} max={31} value={day} onChange={e => setDay(e.target.value)} /></Field>
        </div>
        <Field label="Name" error={tried ? errs.name : undefined}><Input value={name} onChange={e => setName(e.target.value)} placeholder="Rent, phone, Netflix…" autoComplete="off" /></Field>
        <Field label="Category"><Select value={cat} onChange={e => setCat(e.target.value)}>{categories.filter(c => !c.hidden || c.id === cat).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-sm text-foreground">Subscription</span>
            <span className="block text-sm text-muted-foreground mt-0.5">Listed under Subscriptions with what it costs per year</span>
          </span>
          <Switch checked={subscription} onChange={setSubscription} label="Subscription" />
        </label>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="max-sm:flex-1">Save</Button>
        </div>
      </form>
    </Dialog>
  )
}

/** One bill line: tap to edit, the switch pauses it, removing can be undone from the toast. */
function BillRow({ r, cat, currency, onEdit, yearly }: { r: Recurring; cat: Pick<Category, 'icon' | 'color' | 'name'>; currency: string; onEdit: () => void; yearly?: number }) {
  return (
    <TableRow className="pr-2 gap-1">
      <button type="button" onClick={onEdit}
        className={cx('t flex-1 min-w-0 self-stretch -ml-4 -my-2.5 pl-4 pr-2 py-2.5 flex items-center gap-3 text-left hover:bg-muted/50 focus-visible:outline-offset-[-2px]', !r.active && 'opacity-50')}>
        <CategoryBadge category={cat} size={32} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2"><span className="sr-only">Edit </span><span className="text-foreground truncate">{r.name}</span>{!r.active && <Chip>Paused</Chip>}{r.subscription && yearly === undefined && <Chip>Subscription</Chip>}</span>
          <span className="block text-xs text-muted-foreground mt-0.5 truncate">Day {r.dayOfMonth}<span className="max-sm:hidden"> · {cat.name}</span>{yearly !== undefined && <span className="sm:hidden"> · {fmt(r.amount, currency)} a month</span>}</span>
        </span>
        {yearly !== undefined && <span className="max-sm:hidden w-28 text-right text-muted-foreground tabular-nums">{fmt(r.amount, currency)}</span>}
        <span className="sm:w-28 text-right text-foreground tabular-nums">{fmt(yearly ?? r.amount, currency)}</span>
      </button>
      {/* The label widens the switch's tap area to 44px. */}
      <label className="h-11 w-11 shrink-0 inline-flex items-center justify-center cursor-pointer">
        <Switch checked={r.active} onChange={v => useStore.getState().updateRecurring(r.id, { active: v })} label={`${r.name} active`} />
      </label>
      <IconButton label={`Remove ${r.name}`} className="shrink-0" onClick={() => deleteWithUndo('recurring', r.id, 'Removed')}><TrashIcon /></IconButton>
    </TableRow>
  )
}

/** The current month as a grid, each bill on its day. Days that have passed are already posted as expenses. */
function Calendar({ bills, currency }: { bills: Recurring[]; currency: string }) {
  const mk = currentMonthKey(), today = todayISO()
  const [y, m] = mk.split('-').map(Number)
  const lead = new Date(y, m - 1, 1).getDay()
  const byDay = new Map<string, Recurring[]>()
  for (const r of bills) if (r.active) { const d = dayIn(r.dayOfMonth, mk); byDay.set(d, [...(byDay.get(d) ?? []), r]) }
  const f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  return (
    <Card>
      <CardHeader title={monthLabel(mk)} icon={<CalendarDaysIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
        right={<span className="text-sm text-muted-foreground tabular-nums">{fmt(total(bills.filter(r => r.active)), currency)} in bills</span>} />
      <div className="grid grid-cols-7 text-xs text-muted-foreground bg-muted/60 border-b border-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span key={d} className="h-9 flex items-center justify-center"><span className="sm:hidden">{d[0]}</span><span className="max-sm:hidden">{d}</span></span>)}
      </div>
      <div className="grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0">
        {Array.from({ length: lead }, (_, i) => <div key={`lead${i}`} className="border-r border-b border-border bg-muted/30" />)}
        {Array.from({ length: daysInMonth(mk) }, (_, i) => {
          const date = dayIn(i + 1, mk), list = byDay.get(date) ?? [], past = date <= today
          return (
            <div key={date} className="min-h-16 sm:min-h-24 min-w-0 border-r border-b border-border p-1 sm:p-2" aria-label={list.length ? `${dateLabel(date)}: ${list.map(r => r.name).join(', ')}` : undefined}>
              <span className={cx('inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full text-xs tabular-nums', date === today ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{i + 1}</span>
              {list.map(r => (
                <div key={r.id} className={cx('max-sm:hidden mt-1 flex items-baseline justify-between gap-2 text-xs', past ? 'text-muted-foreground' : 'text-foreground')}>
                  <span className="truncate">{r.name}</span><span className="tabular-nums shrink-0">{f0(r.amount)}</span>
                </div>
              ))}
              {list.length > 0 && <div className={cx('sm:hidden mt-1 text-[11px] leading-4 tabular-nums truncate', past ? 'text-muted-foreground' : 'text-foreground')}>{f0(total(list))}</div>}
            </div>
          )
        })}
      </div>
      <p className="px-4 py-3 text-xs text-muted-foreground">Days up to today are in grey: those bills are already in your expenses.</p>
    </Card>
  )
}

export default function Bills() {
  const recurring = useStore(s => s.recurring)
  const categories = useStore(s => s.categories)
  const currency = useStore(s => s.settings.currency)
  const [view, setView] = useState<View>('list')
  const [edit, setEdit] = useState<string | null>(null) // bill id, or 'new'
  const today = todayISO()
  const due = useMemo(() => dueSoon(recurring, today), [recurring, today])
  const subs = useMemo(() => subscriptions(recurring), [recurring])
  const active = recurring.filter(r => r.active)
  const cat = (id: string) => categories.find(c => c.id === id) ?? OTHER
  const f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const add = (cls?: string) => <Button variant="primary" className={cls} onClick={() => setEdit('new')}><PlusIcon />Add bill</Button>

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Bills" subtitle="Fixed costs that add themselves as an expense on their day, every month." actions={add()} />

      <MetricTray>
        <Metric label="Bills per month" icon={<ArrowPathIcon />} value={<AnimatedNumber value={total(active)} format={f0} />} sub={`${active.length} active${recurring.length > active.length ? `, ${recurring.length - active.length} paused` : ''}`} />
        <Metric label="Due in the next 7 days" icon={<ClockIcon />} value={<AnimatedNumber value={total(due.map(d => d.bill))} format={f0} />} sub={due.length ? `${due.length} ${due.length === 1 ? 'bill' : 'bills'}, first ${dateLabel(due[0].date).replace('Tomorrow', 'tomorrow')}` : 'Nothing due'} />
        <Metric label="Subscriptions per year" icon={<CalendarDaysIcon />} value={<AnimatedNumber value={subs.yearly} format={f0} />} sub={`${subs.items.length} ${subs.items.length === 1 ? 'subscription' : 'subscriptions'}, ${f0(subs.monthly)} a month`} />
      </MetricTray>

      {recurring.length === 0 ? (
        <Card><Empty title="No bills yet" text="Add rent, phone or a subscription once. It is added to your expenses on its day every month." action={add()} /></Card>
      ) : (
        <>
          <Segmented<View> value={view} onChange={setView} className="max-sm:flex max-sm:w-full max-sm:[&>button]:flex-1"
            options={[{ value: 'list', label: 'List' }, { value: 'calendar', label: 'Calendar' }, { value: 'subscriptions', label: 'Subscriptions' }]} />

          {view === 'list' && (
            <>
              {due.length > 0 && (
                <Card>
                  <CardHeader title="Due in the next 7 days" icon={<ClockIcon className="h-4 w-4 text-muted-foreground shrink-0" />} right={<span className="text-sm text-muted-foreground tabular-nums">{fmt(total(due.map(d => d.bill)), currency)}</span>} />
                  {due.map(({ bill, date }) => (
                    <TableRow key={bill.id + date} onClick={() => setEdit(bill.id)}>
                      <CategoryBadge category={cat(bill.categoryId)} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-foreground truncate"><span className="sr-only">Edit </span>{bill.name}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{dateLabel(date)}</span>
                      </span>
                      <span className="text-foreground tabular-nums">{fmt(bill.amount, currency)}</span>
                    </TableRow>
                  ))}
                </Card>
              )}
              <Card>
                <CardHeader title="Bills" right={<span className="text-sm text-muted-foreground tabular-nums">{fmt(total(active), currency)} a month</span>} />
                {[...recurring].sort((a, b) => a.dayOfMonth - b.dayOfMonth).map(r => <BillRow key={r.id} r={r} cat={cat(r.categoryId)} currency={currency} onEdit={() => setEdit(r.id)} />)}
              </Card>
            </>
          )}

          {view === 'calendar' && <Calendar bills={recurring} currency={currency} />}

          {view === 'subscriptions' && (
            <Card>
              <CardHeader title="Subscriptions" icon={<ArrowPathIcon className="h-4 w-4 text-muted-foreground shrink-0" />} right={subs.items.length > 0 && <span className="text-sm text-muted-foreground tabular-nums">{fmt(subs.yearly, currency)} a year</span>} />
              {subs.items.length === 0
                ? <Empty title="No subscriptions yet" text="Open a bill and turn on Subscription. Each one is listed here with what it costs in a year." />
                : (
                  <>
                    <TableHead className="max-sm:hidden pr-[106px]"><span className="flex-1">Subscription</span><span className="w-28 text-right">Per month</span><span className="w-28 text-right">Per year</span></TableHead>
                    {subs.items.map(({ bill, yearly }) => <BillRow key={bill.id} r={bill} cat={cat(bill.categoryId)} currency={currency} onEdit={() => setEdit(bill.id)} yearly={yearly} />)}
                  </>
                )}
            </Card>
          )}
        </>
      )}

      {edit && <BillDialog key={edit} bill={recurring.find(r => r.id === edit)} onClose={() => setEdit(null)} />}
    </div>
  )
}
