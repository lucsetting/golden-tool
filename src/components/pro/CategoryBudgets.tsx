import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { Card, CategoryBadge, Input } from '../ui'
import { byCategory, expensesForMonth } from '../../lib/calc'
import { fmt } from '../../lib/money'
import type { Category } from '../../types'

/** Budget rows per category. `example` renders read-only rows with given example budgets (locked teaser). */
export default function CategoryBudgets({ example }: { example?: { category: Category; spent: number; budget: number }[] }) {
  const categories = useStore(s => s.categories)
  const expenses = useStore(s => s.expenses)
  const currency = useStore(s => s.settings.currency)
  const month = useUI(s => s.month)
  const spent = new Map(byCategory(expensesForMonth(expenses, month), categories).map(s => [s.category.id, s.amount]))
  const rows = example ?? categories.map(c => ({ category: c, spent: spent.get(c.id) ?? 0, budget: c.budget ?? 0 }))
  const set = (id: string, v: string) => useStore.getState().updateCategory(id, { budget: Number(v) > 0 ? Number(v) : undefined })

  return (
    <Card>
      {rows.map(({ category: c, spent: s, budget }) => {
        const pct = budget ? (s / budget) * 100 : 0
        const bar = pct > 100 ? 'bg-destructive' : pct > 80 ? 'bg-warn' : 'bg-success'
        return (
          <div key={c.id} className="h-14 px-4 flex items-center gap-3 border-b border-border last:border-b-0">
            <CategoryBadge category={c} size={24} />
            <span className="flex-1 min-w-0 truncate text-sm">{c.name}</span>
            {budget ? (
              <>
                <div className="hidden sm:block w-24 h-1.5 rounded-full bg-muted overflow-hidden"><div className={`t h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                <span className={`hidden sm:block w-24 text-right text-xs tabular-nums ${s > budget ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {s > budget ? `${fmt(s - budget, currency)} over` : `${fmt(budget - s, currency)} left`}
                </span>
              </>
            ) : null}
            {example
              ? <span className="h-8 w-28 inline-flex items-center justify-end text-sm tabular-nums">{fmt(budget, currency, { maximumFractionDigits: 0 })}</span>
              : <Input type="number" inputMode="decimal" aria-label={`${c.name} monthly budget`} className="h-8 w-28 text-right tabular-nums" placeholder="No budget" defaultValue={c.budget ?? ''} onBlur={e => set(c.id, e.target.value)} />}
          </div>
        )
      })}
    </Card>
  )
}
