import { useMemo } from 'react'
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, PlusIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { AnimatedNumber, Button, Card, CardHeader, CategoryBadge, Empty, TableRow } from '../ui'
import ChartCard, { LegendKey } from '../charts/ChartCard'
import MonthBars from './MonthBars'
import { anomalies, categoryTrends, forecastYear } from '../../lib/vision'
import { currentMonthKey, fmt, monthLabel, plural } from '../../lib/money'

const SHORT = (mk: string) => monthLabel(mk, 'short').slice(0, 3)

/** Trends: what is unusually high this month, where the year ends at this pace, and twelve months of every category. */
export default function Trends() {
  const expenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const currency = useStore(s => s.settings.currency)
  const { high, fc, trends } = useMemo(() => ({ high: anomalies(expenses, categories), fc: forecastYear(expenses), trends: categoryTrends(expenses, categories) }), [expenses, categories])
  const cur = currentMonthKey()
  const f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })

  if (expenses.length === 0) {
    return <Card><Empty title="No expenses yet" text="Trends need expenses to draw. Each category gets its own twelve months here, and the year gets a forecast." action={<Button variant="primary" className="max-sm:px-4" onClick={() => useUI.getState().openSheet()}><PlusIcon /><span>Add expense</span></Button>} /></Card>
  }
  return (
    <div className="space-y-6">
      {high.length > 0 && (
        <Card>
          <CardHeader title="Unusually high this month" icon={<ArrowTrendingUpIcon className="h-4 w-4 text-muted-foreground shrink-0" />} right={<span className="text-xs text-muted-foreground max-sm:hidden">More than 40% above its three-month average</span>} />
          {high.map(a => (
            <TableRow key={a.category.id} className="tabular-nums">
              <CategoryBadge category={a.category} />
              <span className="min-w-0 flex-1">
                <span className="block text-foreground truncate">{a.category.name}</span>
                <span className="block text-xs text-muted-foreground mt-0.5 leading-5">{f0(a.soFar)} so far, on pace for {f0(a.pace)} this month. Average of the previous three months: {f0(a.usual)}.</span>
              </span>
              <span className="text-warn shrink-0">+{Math.round(((a.pace - a.usual) / a.usual) * 100)}%</span>
            </TableRow>
          ))}
        </Card>
      )}

      <ChartCard label={`Forecast for ${fc.year}`} value={<AnimatedNumber value={fc.forecast} format={f0} />}
        sub={`${f0(fc.soFar)} spent so far. ${fc.left ? `This month and the ${plural(fc.left, 'month')} left` : 'This month'} at ${f0(fc.usual)}, the average of your last complete months.`}
        right={<div className="flex gap-4 text-xs text-muted-foreground"><LegendKey color="var(--chart)">Spent</LegendKey><LegendKey color="var(--chart-soft)">Expected</LegendKey></div>}>
        <div className="px-2 sm:px-3 pb-3"><MonthBars data={fc.months.map(m => ({ label: SHORT(m.month), value: Math.round(m.actual), more: Math.round(m.expected) }))} currency={currency} /></div>
      </ChartCard>

      <div>
        <h2 className="text-sm text-foreground">Twelve months by category</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{monthLabel(trends[0]?.months[0].month ?? cur, 'short')} to {monthLabel(cur, 'short')}. The change compares the last complete month with the three before it.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {trends.map(t => {
            const max = Math.max(...t.months.map(m => m.amount), 1)
            const Arrow = (t.change ?? 0) > 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon
            return (
              <Card key={t.category.id} className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <CategoryBadge category={t.category} />
                  <span className="flex-1 min-w-0 truncate text-foreground">{t.category.name}</span>
                  <span className="tabular-nums text-foreground">{f0(t.last)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                  <span>{f0(t.sum / 12)} a month on average</span>
                  {t.change === null ? <span>No earlier months</span> : <span className="inline-flex items-center gap-1">{t.change !== 0 && <Arrow className="h-3.5 w-3.5" />}{t.change > 0 ? '+' : ''}{t.change}%</span>}
                </div>
                <div className="mt-4 h-14 flex items-end gap-1" role="img" aria-label={`${t.category.name}, twelve months: ${t.months.map(m => `${SHORT(m.month)} ${f0(m.amount)}`).join(', ')}`}>
                  {t.months.map(m => (
                    <div key={m.month} title={`${monthLabel(m.month, 'short')}: ${f0(m.amount)}`} className="flex-1 rounded-sm" style={{ height: m.amount > 0 ? `${Math.max(6, (m.amount / max) * 100)}%` : 2, background: m.month === cur ? 'var(--chart-soft)' : m.amount > 0 ? 'var(--chart)' : 'var(--muted-2)' }} />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground"><span>{SHORT(t.months[0].month)}</span><span>{SHORT(cur)}</span></div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
