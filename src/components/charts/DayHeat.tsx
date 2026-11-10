import { useMemo, useState } from 'react'
import type { Expense } from '../../types'
import { dayHeat } from '../../lib/vision'
import { daysInMonth, fmt, todayISO } from '../../lib/money'

const OPACITY = [0, 0.2, 0.45, 0.7, 1]
const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'short' }))

/** Every day of a year as a small square, one row per month: the more spent, the darker. Hover or tap a day for its amount. */
export default function DayHeat({ expenses, year, currency }: { expenses: Expense[]; year: string; currency: string }) {
  const heat = useMemo(() => dayHeat(expenses, year), [expenses, year])
  const [picked, setPicked] = useState<string | null>(null)
  const today = todayISO()
  const label = (date: string) => `${new Date(date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ${fmt(heat.days.get(date) ?? 0, currency)}`
  return (
    <div className="p-4 sm:p-5">
      <div className="space-y-1" role="img" aria-label={`Spending by day in ${year}: ${heat.days.size} days with expenses, the highest ${fmt(heat.max, currency)}`}>
        {MONTHS.map((name, m) => {
          const mk = `${year}-${String(m + 1).padStart(2, '0')}`
          return (
            <div key={mk} className="flex items-center gap-2">
              <span className="w-7 shrink-0 text-[11px] text-muted-foreground">{name}</span>
              <div className="flex-1 grid grid-cols-[repeat(31,minmax(0,1fr))] gap-px sm:gap-1">
                {Array.from({ length: daysInMonth(mk) }, (_, d) => {
                  const date = `${mk}-${String(d + 1).padStart(2, '0')}`, level = heat.level(date)
                  return date > today
                    ? <span key={date} className="aspect-square rounded-[2px] sm:rounded-[3px] shadow-[inset_0_0_0_1px_var(--border)]" />
                    : <span key={date} title={label(date)} onPointerEnter={() => setPicked(date)} onClick={() => setPicked(date)}
                      className={`aspect-square rounded-[2px] sm:rounded-[3px] ${level ? '' : 'bg-muted'} ${picked === date ? 'outline outline-1 outline-offset-1 outline-foreground' : ''}`} style={level ? { background: 'var(--chart)', opacity: OPACITY[level] } : undefined} />
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums text-foreground">{picked ? label(picked) : 'Point at a day, or tap it, for its amount'}</span>
        <span className="flex items-center gap-1.5">Less{OPACITY.map((o, i) => <span key={i} className={`h-3 w-3 rounded-[3px] ${i ? '' : 'bg-muted'}`} style={i ? { background: 'var(--chart)', opacity: o } : undefined} />)}More</span>
      </div>
    </div>
  )
}
