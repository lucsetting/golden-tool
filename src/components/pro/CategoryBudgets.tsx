import { useMemo } from 'react'
import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { AnimatedNumber, Card, CardHeader, CategoryBadge, Input, Metric, MetricTray, ProgressBar, TableHead, TableRow, cx } from '../ui'
import { byCategory, expensesForMonth } from '../../lib/calc'
import { fmt, monthLabel } from '../../lib/money'

/** One budget per category for the viewed month: the totals, then a row per category with its amount field. */
export default function CategoryBudgets() {
  const categories = useStore(s => s.categories)
  const expenses = useStore(s => s.expenses)
  const currency = useStore(s => s.settings.currency)
  const month = useUI(s => s.month)
  const spent = useMemo(() => new Map(byCategory(expensesForMonth(expenses, month), categories).map(s => [s.category.id, s.amount])), [expenses, month, categories])
  const budgeted = categories.filter(c => c.budget)
  const over = budgeted.filter(c => (spent.get(c.id) ?? 0) > c.budget!).length
  const f = (n: number) => fmt(n, currency)
  const f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const set = (id: string, v: string) => useStore.getState().updateCategory(id, { budget: Number(v) > 0 ? Number(v) : undefined })

  return (
    <div className="space-y-6">
      <MetricTray>
        <Metric label="Over budget" tone={over ? 'bad' : undefined} value={<AnimatedNumber value={over} format={n => String(Math.round(n))} />} sub={`Of ${budgeted.length} categor${budgeted.length === 1 ? 'y' : 'ies'} with a budget`} />
        <Metric label="Budgeted total" value={<AnimatedNumber value={budgeted.reduce((s, c) => s + c.budget!, 0)} format={f0} />} sub="Per month" />
        <Metric label="Spent in budgeted categories" value={<AnimatedNumber value={budgeted.reduce((s, c) => s + (spent.get(c.id) ?? 0), 0)} format={f0} />} sub={monthLabel(month)} />
      </MetricTray>
      <Card>
        <CardHeader title="Category budgets" right={<span className="text-xs text-muted-foreground">{monthLabel(month)}</span>} />
        {budgeted.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground leading-5 border-b border-border">No budgets set. Type an amount next to a category to give it a budget for every month.</p>}
        <TableHead className="max-xl:hidden">
          <span className="flex-1">Category</span>
          <span className="w-28 text-right">Spent</span>
          <span className="w-36" />
          <span className="w-32 text-right">Left</span>
          <span className="w-28 text-right">Budget per month</span>
        </TableHead>
        {categories.map(c => {
          const s = spent.get(c.id) ?? 0, budget = c.budget ?? 0
          const pct = budget ? (s / budget) * 100 : 0
          const bar = budget ? <ProgressBar value={pct} tone={pct > 100 ? 'bad' : pct > 80 ? 'warn' : undefined} /> : null
          const state = (fm: typeof f) => s > budget ? `${fm(s - budget)} over` : `${fm(budget - s)} left`
          return (
            <TableRow key={c.id} className="tabular-nums">
              <CategoryBadge category={c} />
              <div className="flex-1 min-w-0">
                <div className="truncate text-foreground">{c.name}</div>
                <div className="xl:hidden mt-1 text-xs text-muted-foreground truncate">
                  {budget ? <>{f0(s)} of {f0(budget)} · <span className={cx(s > budget && 'text-destructive')}>{state(f0)}</span></> : `${f0(s)} spent`}
                </div>
                {bar && <div className="xl:hidden mt-2">{bar}</div>}
              </div>
              <span className="max-xl:hidden w-28 text-right text-muted-foreground">{f(s)}</span>
              <div className="max-xl:hidden w-36 pl-6">{bar}</div>
              <span className={cx('max-xl:hidden w-32 text-right', s > budget && budget ? 'text-destructive' : 'text-muted-foreground')}>{budget ? state(f) : '—'}</span>
              <Input type="number" inputMode="decimal" aria-label={`${c.name} monthly budget`} className="w-28! shrink-0 text-right" placeholder="No budget" defaultValue={c.budget ?? ''} onBlur={e => set(c.id, e.target.value)} />
            </TableRow>
          )
        })}
      </Card>
    </div>
  )
}
