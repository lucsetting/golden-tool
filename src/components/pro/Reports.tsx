import { useMemo, useState } from 'react'
import { ArrowsRightLeftIcon, CalendarDaysIcon, PlusIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { AnimatedNumber, Button, Card, CardHeader, CategoryBadge, Empty, Metric, MetricTray, ProgressBar, Select, TableHead, TableRow } from '../ui'
import MonthBars from './MonthBars'
import DayHeat from '../charts/DayHeat'
import { byCategory, expensesForMonth, total } from '../../lib/calc'
import { yearCompare } from '../../lib/vision'
import { currentMonthKey, fmt, plural } from '../../lib/money'

const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' }))

/** Yearly report: the year's total over twelve bars, three numbers, the year before beside it, every day as a heatmap, then the categories. */
export default function Reports() {
  const expenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const currency = useStore(s => s.settings.currency)
  const limit = useStore(s => s.settings.monthlyLimit)
  const thisYear = currentMonthKey().slice(0, 4)
  const [year, setYear] = useState(thisYear)
  const years = useMemo(() => [...new Set([thisYear, ...expenses.map(e => e.date.slice(0, 4))])].sort().reverse(), [expenses, thisYear])
  const { data, sum, active, low, high, slices } = useMemo(() => {
    const data = MONTHS.map((m, i) => ({ label: m.slice(0, 3), name: m, value: total(expensesForMonth(expenses, `${year}-${String(i + 1).padStart(2, '0')}`)) }))
    const active = data.filter(d => d.value > 0)
    return {
      data, active, sum: data.reduce((s, d) => s + d.value, 0),
      low: active.reduce((a, b) => (b.value < a.value ? b : a), active[0]),
      high: active.reduce((a, b) => (b.value > a.value ? b : a), active[0]),
      slices: byCategory(expenses.filter(e => e.date.startsWith(year)), categories),
    }
  }, [expenses, categories, year])
  const yc = useMemo(() => yearCompare(expenses, year), [expenses, year])
  const f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const diff = (n: number | null) => (n === null ? <span className="text-muted-foreground">—</span> : <span className={n > 0 ? 'text-destructive' : n < 0 ? 'text-success' : 'text-muted-foreground'}>{n > 0 ? '+' : n < 0 ? '−' : ''}{f0(Math.abs(n))}</span>)

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">Spent in {year}</div>
            <div className="text-3xl tabular-nums tracking-tight mt-3"><AnimatedNumber value={sum} format={f0} /></div>
            <div className="text-sm text-muted-foreground mt-3">
              {active.length} month{active.length === 1 ? '' : 's'} with expenses{limit ? ` · monthly limit ${f0(limit)}` : ''}
            </div>
          </div>
          <div className="w-28 shrink-0">
            <Select value={year} onChange={e => setYear(e.target.value)} aria-label="Year">{years.map(y => <option key={y}>{y}</option>)}</Select>
          </div>
        </div>
        {sum > 0
          ? <div className="px-2 sm:px-3 pb-3"><MonthBars data={data} currency={currency} limit={limit || undefined} /></div>
          : <Empty className="border-t border-border" title={`No expenses in ${year}`} text="Each expense dated in this year adds to its month here." action={year === thisYear && <Button variant="primary" className="max-sm:px-4" onClick={() => useUI.getState().openSheet()}><PlusIcon /><span>Add expense</span></Button>} />}
      </Card>
      {sum > 0 && (
        <>
          <MetricTray>
            <Metric label="Monthly average" value={<AnimatedNumber value={sum / active.length} format={f0} />} sub={`Over ${active.length} month${active.length === 1 ? '' : 's'} with expenses`} />
            <Metric label="Lowest month" value={low.name} sub={f0(low.value)} />
            <Metric label="Highest month" value={high.name} sub={f0(high.value)} />
          </MetricTray>
          <Card>
            <CardHeader title={`${year} against ${yc.prevYear}`} icon={<ArrowsRightLeftIcon className="h-4 w-4 text-muted-foreground shrink-0" />} />
            {!yc.hasPrev ? <p className="px-4 py-3 text-sm text-muted-foreground leading-5">No expenses in {yc.prevYear} to compare with. Once two years have expenses, each month shows here beside the same month a year earlier.</p> : (
              <div className="tabular-nums">
                <TableHead><span className="flex-1">Month</span><span className="w-20 sm:w-24 text-right">{year}</span><span className="w-20 sm:w-24 text-right">{yc.prevYear}</span><span className="w-20 sm:w-24 text-right">Difference</span></TableHead>
                {yc.rows.map(r => (
                  <div key={r.month} className="h-10 px-4 flex items-center gap-3 text-sm border-b border-border">
                    <span className="flex-1 text-foreground"><span className="sm:hidden">{MONTHS[r.month].slice(0, 3)}</span><span className="max-sm:hidden">{MONTHS[r.month]}</span></span>
                    <span className="w-20 sm:w-24 text-right">{r.now === null ? <span className="text-muted-foreground">—</span> : f0(r.now)}</span>
                    <span className="w-20 sm:w-24 text-right text-muted-foreground">{r.prev > 0 ? f0(r.prev) : '—'}</span>
                    <span className="w-20 sm:w-24 text-right">{diff(r.diff)}</span>
                  </div>
                ))}
                <div className="h-11 px-4 flex items-center gap-3 text-sm bg-muted/60">
                  <span className="flex-1 text-foreground">Total</span>
                  <span className="w-20 sm:w-24 text-right">{f0(yc.now)}</span>
                  <span className="w-20 sm:w-24 text-right text-muted-foreground">{f0(yc.prev)}</span>
                  <span className="w-20 sm:w-24 text-right">{diff(yc.diff)}</span>
                </div>
                {yc.months < 12 && <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border">The total covers the {plural(yc.months, 'month')} that have expenses in both years.</p>}
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Day by day" icon={<CalendarDaysIcon className="h-4 w-4 text-muted-foreground shrink-0" />} right={<span className="text-xs text-muted-foreground">{year}</span>} />
            <DayHeat expenses={expenses} year={year} currency={currency} />
          </Card>
          <Card>
            <CardHeader title="By category this year" />
            <TableHead>
              <span className="flex-1">Category</span>
              <span className="w-28 text-right">Amount</span>
              <span className="w-12 text-right">Share</span>
            </TableHead>
            {slices.map(s => (
              <TableRow key={s.category.id} className="tabular-nums">
                <CategoryBadge category={s.category} />
                <span className="flex-1 min-w-0 truncate text-foreground">{s.category.name}</span>
                <ProgressBar value={s.pct} color={s.category.color} className="max-sm:hidden w-40" />
                <span className="w-28 text-right">{fmt(s.amount, currency)}</span>
                <span className="w-12 text-right text-xs text-muted-foreground">{Math.round(s.pct)}%</span>
              </TableRow>
            ))}
          </Card>
        </>
      )}
    </div>
  )
}
