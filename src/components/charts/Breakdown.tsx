import { useState } from 'react'
import type { CategorySlice } from '../../lib/calc'
import { fmt, fmtCompact } from '../../lib/money'
import { Button, Card, CardHeader, CategoryBadge, Empty, cx } from '../ui'
import { useUI } from '../../ui-state'
import Donut from './Donut'

/** Mochi "Revenue breakdown": stacked bar + legend, then donut and category rows. Click anything to focus a category. */
export default function Breakdown({ slices, spent, limit, currency }: { slices: CategorySlice[]; spent: number; limit: number; currency: string }) {
  const [active, setActive] = useState<string | null>(null)
  const pick = (id: string | null) => setActive(a => (a === id ? null : id))
  const dim = (id: string) => (active && active !== id ? 'opacity-25' : '')
  const left = limit - spent
  return (
    <Card>
      <CardHeader title="Where it went" />
      {!slices.length ? (
        <Empty title="No expenses this month" text="Add one to see where your money goes." action={<Button variant="primary" onClick={() => useUI.getState().openSheet()}>Add expense</Button>} />
      ) : (
        <>
          <div className="p-4">
            <div className="flex h-2 gap-1">
              {slices.map(s => <button key={s.category.id} aria-label={s.category.name} onClick={() => pick(s.category.id)} className={cx('t h-full rounded-full min-w-1', dim(s.category.id))} style={{ flexGrow: s.amount, background: s.category.color }} />)}
              {left > 0 && <span className={cx('t h-full rounded-full bg-muted-2', active && 'opacity-25')} style={{ flexGrow: left }} />}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-sm">
              {slices.map(s => (
                <button key={s.category.id} onClick={() => pick(s.category.id)} className={cx('t inline-flex items-center gap-1.5', dim(s.category.id))}>
                  <span className="h-2 w-2 rounded-full" style={{ background: s.category.color }} />
                  <span className="text-foreground tabular-nums">{fmtCompact(s.amount, currency)}</span>
                  <span className="text-muted-foreground">{s.category.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-border p-4 flex flex-col sm:flex-row items-center gap-6">
            <Donut slices={slices} totalSpent={spent} currency={currency} active={active} onSelect={pick} />
            <div className="w-full min-w-0 flex-1">
              {slices.map(s => (
                <button key={s.category.id} onClick={() => pick(s.category.id)} className={cx('t w-full text-left py-2.5 flex items-center gap-3', dim(s.category.id))}>
                  <CategoryBadge category={s.category} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="text-foreground truncate">{s.category.name}</span>
                      <span className="text-muted-foreground">{s.count}</span>
                      <span className="ml-auto text-foreground tabular-nums">{fmt(s.amount, currency)}</span>
                      <span className="w-12 text-right text-muted-foreground tabular-nums">{Math.round(s.pct)}%</span>
                    </span>
                    <span className="block h-1 rounded-full bg-muted mt-2.5 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${s.pct}%`, background: s.category.color }} /></span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
