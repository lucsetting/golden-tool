import { useStore } from '../../store'
import { Card, CardHeader, CategoryBadge, Metric, MetricTray } from '../ui'
import MonthBars from './MonthBars'
import { byCategory, expensesForMonth, total } from '../../lib/calc'
import { fmt, monthLabel } from '../../lib/money'

/** Yearly report body (no export buttons). Year is chosen by the page. */
export default function Reports({ year }: { year: string }) {
  const expenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const { currency, monthlyLimit } = useStore(s => s.settings)
  const data = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'short' }),
    value: total(expensesForMonth(expenses, `${year}-${String(i + 1).padStart(2, '0')}`)),
  }))
  const sum = data.reduce((s, d) => s + d.value, 0)
  const active = data.filter(d => d.value > 0)
  const best = active.length ? active.reduce((a, b) => (b.value < a.value ? b : a)) : undefined
  const bestIdx = best ? data.indexOf(best) : -1
  const slices = byCategory(expenses.filter(e => e.date.startsWith(year)), categories)
  const f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })

  return (
    <div className="space-y-4">
      <MetricTray className="sm:grid-cols-3">
        <Metric label="Year total" value={f0(sum)} />
        <Metric label="Monthly average" value={f0(active.length ? sum / active.length : 0)} sub={active.length ? `Over ${active.length} month${active.length === 1 ? '' : 's'} with spending` : undefined} />
        <Metric label="Best month" value={best ? monthLabel(`${year}-${String(bestIdx + 1).padStart(2, '0')}`, 'long').replace(/ \d+$/, '') : '-'} sub={best ? f0(best.value) : undefined} />
      </MetricTray>
      <Card>
        <CardHeader title="Monthly" />
        <div className="p-4"><MonthBars data={data} currency={currency} limit={monthlyLimit || undefined} /></div>
      </Card>
      <Card>
        <CardHeader title="By category this year" />
        {slices.length ? slices.map(s => (
          <div key={s.category.id} className="h-14 px-4 flex items-center gap-3 border-b border-border last:border-b-0">
            <CategoryBadge category={s.category} size={24} />
            <span className="flex-1 min-w-0 truncate text-sm">{s.category.name}</span>
            <div className="hidden sm:block w-24 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gold" style={{ width: `${s.pct}%` }} /></div>
            <span className="w-24 text-right text-sm tabular-nums">{fmt(s.amount, currency)}</span>
            <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{Math.round(s.pct)}%</span>
          </div>
        )) : <div className="p-5 text-sm text-muted-foreground">No expenses in {year}.</div>}
      </Card>
    </div>
  )
}
