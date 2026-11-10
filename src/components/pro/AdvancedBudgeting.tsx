import { useMemo, useState } from 'react'
import { LockClosedIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { Button, Card, CardHeader, CategoryBadge, Chip, Dialog, Segmented, Switch, TableRow, dialogFooterCls } from '../ui'
import { MODULES } from '../../lib/modules'
import { averageIncome, fiftyThirtyTwenty, groupOf, rollover, type Group } from '../../lib/vision'
import { currentMonthKey, fmt, monthKey, monthLabel, shiftMonth } from '../../lib/money'

/** The 50/30/20 preset: the three amounts from the average income, each category as a need or a want, and the budgets that follow. */
function Preset({ onClose }: { onClose: () => void }) {
  const categories = useStore(s => s.categories)
  const expenses = useStore(s => s.expenses)
  const incomes = useStore(s => s.incomes)
  const currency = useStore(s => s.settings.currency)
  const shown = useMemo(() => categories.filter(c => !c.hidden), [categories])
  const [groups, setGroups] = useState<Record<string, Group>>(() => Object.fromEntries(shown.map(c => [c.id, groupOf(c)])))
  const income = useMemo(() => averageIncome(incomes), [incomes])
  // What each category usually costs: its average over the last three complete months.
  const usual = useMemo(() => {
    const cur = currentMonthKey(), from = shiftMonth(cur, -3), m = new Map<string, number>()
    for (const e of expenses) if (monthKey(e.date) >= from && monthKey(e.date) < cur) m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + e.amount / 3)
    return m
  }, [expenses])
  const split = useMemo(() => fiftyThirtyTwenty(income, shown.map(c => ({ id: c.id, group: groups[c.id] })), usual), [income, shown, groups, usual])
  const f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const apply = () => {
    const before = useStore.getState().categories
    useStore.setState({ categories: before.map(c => (c.id in groups ? { ...c, group: groups[c.id], budget: split.budgets.get(c.id) || undefined } : c)) })
    useUI.getState().showToast('Budgets filled from 50/30/20', 'ok', { label: 'Undo', run: () => useStore.setState({ categories: before }) })
    onClose()
  }
  return (
    <Dialog open onClose={onClose} title="Fill budgets from 50/30/20" width={560}
      description={income > 0 ? `From your average income of ${f0(income)} a month. This replaces the budgets you have now.` : undefined}>
      {income <= 0 ? (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground leading-5">The preset works from your average income, and no income is recorded yet.</p>
          <div className="flex justify-end gap-2 [&>button]:max-sm:flex-1">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={() => { onClose(); useUI.getState().setTab('cashflow') }}>Open cash flow</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <dl className="grid grid-cols-3 gap-2 text-sm tabular-nums">
            {([['Needs · 50%', split.needs], ['Wants · 30%', split.wants], ['Savings target · 20%', split.savings]] as const).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-muted p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 text-foreground">{f0(v)}</dd></div>
            ))}
          </dl>
          <div className="-mx-5 sm:-mx-6 border-y border-border">
            {shown.map(c => (
              <div key={c.id} className="min-h-12 px-5 sm:px-6 py-2 flex items-center gap-3 text-sm border-b border-border last:border-b-0">
                <CategoryBadge category={c} />
                <span className="flex-1 min-w-0 truncate text-foreground">{c.name}</span>
                <Segmented value={groups[c.id]} onChange={g => setGroups(s => ({ ...s, [c.id]: g }))} options={[{ value: 'needs', label: 'Need' }, { value: 'wants', label: 'Want' }]} className="ctl-sm!" />
                <span className="w-16 text-right tabular-nums text-foreground">{split.budgets.get(c.id) ? f0(split.budgets.get(c.id)!) : '—'}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-5">Inside needs and inside wants, each category gets its share of what it cost over the last three months. A group with no history is split evenly.</p>
          <div className={dialogFooterCls}>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={apply}>Set these budgets</Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

/** Golden Vision on the Budgets screen: the 50/30/20 preset, rollover per category and the way to the budget report.
 *  Without the add-on the same card is shown inert under a line that says what it is. */
export default function AdvancedBudgeting({ unlocked, month, spentLast }: { unlocked: boolean; month: string; spentLast: Map<string, number> }) {
  const categories = useStore(s => s.categories)
  const currency = useStore(s => s.settings.currency)
  const [preset, setPreset] = useState(false)
  const budgeted = categories.filter(c => c.budget)
  const f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const setTab = useUI.getState().setTab
  const body = (
    <>
      <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border">
        <div className="min-w-0 text-sm"><div className="text-foreground">50/30/20 preset</div><div className="text-muted-foreground mt-0.5">Fill every budget from your average income: half for needs, 30% for wants, 20% as a savings target.</div></div>
        <Button className="shrink-0" onClick={() => setPreset(true)}>Fill budgets</Button>
      </div>
      <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border">
        <div className="min-w-0 text-sm"><div className="text-foreground">Budget report</div><div className="text-muted-foreground mt-0.5">Budgeted against actual for the last six months, category by category.</div></div>
        <Button className="shrink-0" onClick={() => setTab('reports-budget')}>Open report</Button>
      </div>
      <div className="p-4 text-sm"><div className="text-foreground">Rollover</div><div className="text-muted-foreground mt-0.5">What a budget left unused last month is added to this month, up to one month of that budget.</div></div>
      {budgeted.length === 0 ? <p className="px-4 pb-4 text-sm text-muted-foreground">Give a category a budget to switch rollover on for it.</p> : budgeted.map(c => {
        const carried = c.rollover ? rollover(c.budget!, spentLast.get(c.id) ?? 0) : 0
        return (
          <TableRow key={c.id} className="border-t! border-b-0! tabular-nums">
            <CategoryBadge category={c} />
            <span className="flex-1 min-w-0 truncate text-foreground">{c.name}</span>
            {c.rollover && <span className="text-xs text-muted-foreground">{carried > 0 ? `+${f0(carried)} from ${monthLabel(shiftMonth(month, -1), 'short')}` : `Nothing left over in ${monthLabel(shiftMonth(month, -1), 'short')}`}</span>}
            <Switch checked={!!c.rollover} onChange={v => useStore.getState().updateCategory(c.id, { rollover: v || undefined })} label={`Rollover for ${c.name}`} />
          </TableRow>
        )
      })}
    </>
  )
  return (
    <Card>
      <CardHeader title="Advanced budgeting" right={unlocked ? <Chip tone="outline">{MODULES.reports.name}</Chip> : <Button size="sm" onClick={() => setTab('reports')}><LockClosedIcon /><span>{MODULES.reports.name}</span></Button>} />
      {unlocked ? body : <div inert aria-hidden className="opacity-50 select-none">{body}</div>}
      {preset && <Preset onClose={() => setPreset(false)} />}
    </Card>
  )
}
