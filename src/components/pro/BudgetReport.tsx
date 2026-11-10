import { useMemo } from 'react'
import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { Button, Card, CardHeader, CategoryBadge, Empty, cx } from '../ui'
import { budgetState } from '../../lib/calc'
import { budgetReport } from '../../lib/vision'
import { fmt, monthLabel } from '../../lib/money'

const TONE = { none: 'var(--chart)', ok: 'var(--chart)', warn: 'var(--warn)', over: 'var(--destructive)' }

/** Budgeted against actual for the last six months: one row per category with a budget, one bar per month against the budget line. */
export default function BudgetReport() {
  const expenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const currency = useStore(s => s.settings.currency)
  const { months, tracked, rows } = useMemo(() => budgetReport(expenses, categories), [expenses, categories])
  const f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })

  if (rows.length === 0) {
    return <Card><Empty title="No budgets to report on" text="Give a category a budget and this report shows, month by month, whether it held." action={<Button variant="primary" className="max-sm:px-4" onClick={() => useUI.getState().setTab('budgets')}>Open budgets</Button>} /></Card>
  }
  return (
    <Card>
      <CardHeader title="Budgeted against actual" right={<span className="text-xs text-muted-foreground">{monthLabel(months[0], 'short')} to {monthLabel(months[months.length - 1], 'short')}</span>} />
      {rows.map(r => {
        const top = Math.max(r.budget, ...r.actual)
        return (
          <div key={r.category.id} className="px-4 py-4 border-b border-border last:border-b-0 sm:flex sm:items-center sm:gap-6">
            <div className="flex items-center gap-3 sm:w-56 sm:shrink-0 text-sm">
              <CategoryBadge category={r.category} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-foreground">{r.category.name}</span>
                <span className="block text-xs text-muted-foreground mt-0.5 tabular-nums">{f0(r.budget)} budget · {f0(r.average)} on average</span>
              </span>
            </div>
            <div className="flex-1 grid grid-cols-6 gap-2 max-sm:mt-4">
              {r.actual.map((a, i) => {
                const state = budgetState(a, r.budget)
                // A month before the customer's first expense has nothing to hold against the budget.
                if (i < months.length - tracked) return <div key={months[i]} className="min-w-0 text-center"><div className="h-12" /><div className="mt-1.5 text-xs text-muted-foreground">—</div><div className="text-[11px] text-muted-foreground">{monthLabel(months[i], 'short').slice(0, 3)}</div></div>
                return (
                  <div key={months[i]} className="min-w-0 text-center" title={`${monthLabel(months[i])}: ${f0(a)} of ${f0(r.budget)}`}>
                    <div className="relative h-12 flex items-end justify-center">
                      <div className="w-full max-w-5 rounded-t-[3px]" style={{ height: a > 0 ? `${Math.max(4, (a / top) * 100)}%` : 2, background: a > 0 ? TONE[state] : 'var(--muted-2)' }} />
                      <div className="absolute inset-x-0 border-t border-dashed border-muted-foreground/60" style={{ bottom: `${(r.budget / top) * 100}%` }} />
                    </div>
                    <div className={cx('mt-1.5 text-xs tabular-nums truncate', state === 'over' ? 'text-destructive' : 'text-foreground')}>{f0(a)}</div>
                    <div className="text-[11px] text-muted-foreground">{monthLabel(months[i], 'short').slice(0, 3)}</div>
                  </div>
                )
              })}
            </div>
            <div className="sm:w-28 sm:shrink-0 sm:text-right text-xs text-muted-foreground max-sm:mt-3 tabular-nums"><span className="text-foreground sm:block sm:text-sm">{r.within} of {tracked}</span> {tracked === 1 ? 'month' : 'months'} within budget</div>
          </div>
        )
      })}
      <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border">The dashed line is the budget as it is set today. Rollover is not counted here.</p>
    </Card>
  )
}
