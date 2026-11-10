import { useMemo } from 'react'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { AnimatedNumber, Card, CardHeader, CategoryBadge, Chip, Input, Metric, MetricTray, PageHeader, ProgressBar, TableHead, TableRow, cx } from '../components/ui'
import MonthPicker from '../components/MonthPicker'
import { budgetState, byCategory, expensesForMonth } from '../lib/calc'
import { fmt, monthLabel } from '../lib/money'

/** One budget per category: the totals, how they compare with the monthly limit, then a row per category with its amount field. */
export default function Budgets() {
  const categories = useStore(s => s.categories)
  const expenses = useStore(s => s.expenses)
  const currency = useStore(s => s.settings.currency)
  const limit = useStore(s => s.settings.monthlyLimit)
  const month = useUI(s => s.month)
  const spent = useMemo(() => new Map(byCategory(expensesForMonth(expenses, month), categories).map(s => [s.category.id, s.amount])), [expenses, month, categories])
  const budgeted = categories.filter(c => c.budget)
  const sum = budgeted.reduce((s, c) => s + c.budget!, 0)
  const states = budgeted.map(c => budgetState(spent.get(c.id) ?? 0, c.budget))
  const over = states.filter(s => s === 'over').length, near = states.filter(s => s === 'warn').length
  const f = (n: number) => fmt(n, currency)
  const f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const set = (id: string, v: string) => useStore.getState().updateCategory(id, { budget: Number(v) > 0 ? Number(v) : undefined })
  // A hidden category still shows while it has a budget or spending this month.
  const rows = categories.filter(c => !c.hidden || c.budget || spent.get(c.id))

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Budgets" subtitle="A budget per category for every month. A bar turns amber at 80% and red when the category goes over." actions={<MonthPicker />} />
      <MetricTray>
        <Metric label="Over budget" tone={over ? 'bad' : undefined} value={<AnimatedNumber value={over} format={n => String(Math.round(n))} />} sub={near ? `${near} more at 80% or above` : `Of ${budgeted.length} categor${budgeted.length === 1 ? 'y' : 'ies'} with a budget`} />
        <Metric label="Budgeted total" tone={limit > 0 && sum > limit ? 'bad' : undefined} value={<AnimatedNumber value={sum} format={f0} />} sub={limit > 0 ? `Monthly limit ${f0(limit)}` : 'Per month'} />
        <Metric label="Spent in budgeted categories" value={<AnimatedNumber value={budgeted.reduce((s, c) => s + (spent.get(c.id) ?? 0), 0)} format={f0} />} sub={monthLabel(month)} />
      </MetricTray>
      <Card>
        <CardHeader title="Category budgets" right={<span className="text-xs text-muted-foreground">{monthLabel(month)}</span>} />
        {budgeted.length === 0
          ? <p className="px-4 py-3 text-sm text-muted-foreground leading-5 border-b border-border">No budgets set. Type an amount next to a category to give it a budget for every month.</p>
          : limit > 0 && (
            <p className={cx('px-4 py-3 text-sm leading-5 border-b border-border', sum > limit ? 'bg-destructive-soft text-destructive' : 'text-muted-foreground')}>
              {sum > limit
                ? `Your budgets add up to ${f0(sum)}, ${f0(sum - limit)} more than your ${f0(limit)} monthly limit.`
                : `Your budgets add up to ${f0(sum)} of your ${f0(limit)} monthly limit. ${f0(limit - sum)} has no budget.`}
            </p>
          )}
        <TableHead className="max-xl:hidden">
          <span className="flex-1">Category</span>
          <span className="w-28 text-right">Spent</span>
          <span className="w-36" />
          <span className="w-32 text-right">Left</span>
          <span className="w-28 text-right">Budget per month</span>
        </TableHead>
        {rows.map(c => {
          const s = spent.get(c.id) ?? 0, budget = c.budget ?? 0, state = budgetState(s, budget)
          const bar = budget ? <ProgressBar value={(s / budget) * 100} tone={state === 'over' ? 'bad' : state === 'warn' ? 'warn' : undefined} /> : null
          const left = (fm: typeof f) => s > budget ? `${fm(s - budget)} over` : `${fm(budget - s)} left`
          const tone = state === 'over' ? 'text-destructive' : state === 'warn' ? 'text-warn' : 'text-muted-foreground'
          return (
            <TableRow key={c.id} className="tabular-nums">
              <CategoryBadge category={c} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="truncate text-foreground">{c.name}</span>{c.hidden && <Chip>Hidden</Chip>}</div>
                <div className="xl:hidden mt-1 text-xs text-muted-foreground truncate">
                  {budget ? <>{f0(s)} of {f0(budget)} · <span className={tone}>{left(f0)}</span></> : `${f0(s)} spent`}
                </div>
                {bar && <div className="xl:hidden mt-2">{bar}</div>}
              </div>
              <span className="max-xl:hidden w-28 text-right text-muted-foreground">{f(s)}</span>
              <div className="max-xl:hidden w-36 pl-6">{bar}</div>
              <span className={cx('max-xl:hidden w-32 text-right', tone)}>{budget ? left(f) : '—'}</span>
              {/* The key follows the stored budget, so a restore or an undo shows in the field. */}
              <Input key={c.budget ?? 0} type="number" inputMode="decimal" min="0" aria-label={`${c.name} monthly budget`} className="w-28! shrink-0 text-right" placeholder="No budget" defaultValue={c.budget ?? ''}
                onBlur={e => set(c.id, e.target.value)} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
            </TableRow>
          )
        })}
      </Card>
    </div>
  )
}
