import { useState } from 'react'
import type { CategorySlice } from '../../lib/calc'
import { fmt } from '../../lib/money'
import { Card, CardHeader, CategoryBadge, cx } from '../ui'
import Donut from './Donut'

/** Spending by category: a donut with the total, then a row per category. Click a slice or a row to focus that category. */
export default function Breakdown({ slices, spent, currency }: { slices: CategorySlice[]; spent: number; currency: string }) {
  const [active, setActive] = useState<string | null>(null)
  const pick = (id: string) => setActive(a => (a === id ? null : id))
  const dim = (id: string) => (active && active !== id ? 'opacity-25' : '')
  return (
    <Card>
      <CardHeader title="Where it went" right={<span className="text-sm text-muted-foreground">{slices.length} {slices.length === 1 ? 'category' : 'categories'}</span>} />
      <div className="sm:flex sm:items-center">
        <div className="flex justify-center p-4 sm:pr-0"><Donut slices={slices} totalSpent={spent} currency={currency} active={active} onSelect={id => setActive(id)} /></div>
        <div className="min-w-0 flex-1 pb-2 sm:py-2">
      {slices.map(s => (
        <button key={s.category.id} type="button" aria-pressed={active === s.category.id} onClick={() => pick(s.category.id)} className={cx('t w-full min-h-11 px-4 py-2 flex items-center gap-3 text-left text-sm hover:bg-muted/50 focus-visible:outline-offset-[-2px]', dim(s.category.id))}>
          <CategoryBadge category={s.category} />
          <span className="min-w-0 flex-1 truncate text-foreground">{s.category.name}<span className="text-muted-foreground ml-2">{s.count}</span></span>
          <span className="text-foreground tabular-nums">{fmt(s.amount, currency)}</span>
          <span className="w-10 text-right text-muted-foreground tabular-nums">{Math.round(s.pct)}%</span>
        </button>
      ))}
        </div>
      </div>
    </Card>
  )
}
