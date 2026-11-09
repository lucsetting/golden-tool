import { useMemo } from 'react'
import { ArrowUpRightIcon, BanknotesIcon, ChartBarIcon, ClockIcon, HashtagIcon, MoonIcon, PlusIcon, ScaleIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { byCategory, expensesForMonth, monthStats, monthlyHistory, total } from '../lib/calc'
import { currentMonthKey, daysInMonth, fmt, monthLabel, shiftMonth, todayISO } from '../lib/money'
import { AnimatedNumber, Button, Card, CardHeader, CategoryBadge, Empty, Metric, MetricTray, PageHeader, TableHead, TableRow } from '../components/ui'
import MonthPicker from '../components/MonthPicker'
import MonthBars from '../components/pro/MonthBars'
import ChartCard from '../components/charts/ChartCard'

const WD = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function Insights() {
  const month = useUI(s => s.month)
  const currency = useStore(s => s.settings.currency)
  const limit = useStore(s => s.settings.monthlyLimit)
  const all = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const m0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const m2 = (n: number) => fmt(n, currency)
  const prevLabel = monthLabel(shiftMonth(month, -1))

  const d = useMemo(() => {
    const exps = expensesForMonth(all, month)
    const prevExps = expensesForMonth(all, shiftMonth(month, -1))
    const history = monthlyHistory(all, 6, month).map(h => ({ ...h, label: monthLabel(h.month, 'short').split(' ')[0], value: h.spent }))
    const cur = byCategory(exps, categories)
    const prev = byCategory(prevExps, categories)
    const cats = [...new Map([...cur, ...prev].map(s => [s.category.id, s.category])).values()]
      .map(category => {
        const amount = cur.find(s => s.category.id === category.id)?.amount ?? 0
        const before = prev.find(s => s.category.id === category.id)?.amount ?? 0
        return { category, amount, delta: Math.round(amount - before) }
      }).sort((a, b) => b.amount - a.amount || a.delta - b.delta)
    const merchants = new Map<string, { name: string; amount: number; count: number }>()
    for (const e of exps) {
      const k = e.name.trim().toLowerCase()
      const m = merchants.get(k) ?? { name: e.name.trim(), amount: 0, count: 0 }
      m.amount += e.amount; m.count++; merchants.set(k, m)
    }
    // weekday averages over the last 3 months (up to today)
    const start = shiftMonth(month, -2) + '-01'
    const end = month === currentMonthKey() ? todayISO() : `${month}-${daysInMonth(month)}`
    const sums = new Array(7).fill(0), days = new Array(7).fill(0)
    const wd = (iso: string) => (new Date(iso + 'T00:00:00').getDay() + 6) % 7
    for (const e of all) if (e.date >= start && e.date <= end) sums[wd(e.date)] += e.amount
    for (let t = new Date(start + 'T00:00:00'); ; t.setDate(t.getDate() + 1)) {
      const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
      if (iso > end) break
      days[wd(iso)]++
    }
    const weekday = WD.map((name, i) => ({ name, avg: days[i] ? sums[i] / days[i] : 0 }))
    const st = monthStats(exps, month, limit)
    const pool = history.filter(h => h.spent > 0)
    return {
      exps, history, cats, weekday, st,
      prevTotal: total(prevExps),
      sum6: total(history.map(h => ({ amount: h.spent }))),
      over6: history.filter(h => h.spent > limit).length,
      avg: pool.length ? pool.reduce((s, h) => s + h.spent, 0) / pool.length : 0,
      top: weekday.reduce((b, w) => (w.avg > b.avg ? w : b)),
      merchants: [...merchants.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
      biggest: exps.reduce<typeof exps[number] | undefined>((b, e) => (!b || e.amount > b.amount ? e : b), undefined),
      noSpend: Math.max(0, st.dayOfMonth - new Set(exps.map(e => e.date)).size),
    }
  }, [all, categories, month, limit])

  const header = <PageHeader title="Insights" subtitle={`${monthLabel(month)} compared with ${prevLabel}`} actions={<MonthPicker />} />
  if (!d.sum6) return (
    <>{header}<Card><Empty title="No expenses to compare yet" text="Add expenses and this page compares months, categories, merchants and weekdays."
      action={<Button variant="primary" onClick={() => useUI.getState().openSheet()}><PlusIcon />Add expense</Button>} /></Card></>
  )

  const pct = d.prevTotal ? Math.round(((d.st.spent - d.prevTotal) / d.prevTotal) * 100) : null
  const none = `No expenses in ${monthLabel(month)}`

  return (
    <div className="space-y-6 pb-6">
      {header}
      <MetricTray>
        <Metric label="This month" icon={<BanknotesIcon />} value={<AnimatedNumber value={d.st.spent} format={m0} />} sub={pct === null ? monthLabel(month) : <span className={pct < 0 ? 'text-success' : undefined}>{pct > 0 ? '+' : ''}{pct}% vs last month</span>} />
        <Metric label="Last month" icon={<ClockIcon />} value={<AnimatedNumber value={d.prevTotal} format={m0} />} sub={prevLabel} />
        <Metric label="Monthly average" icon={<ScaleIcon />} value={<AnimatedNumber value={d.avg} format={m0} />} sub="Last 6 months with expenses" />
      </MetricTray>

      <ChartCard label={`Spent, ${monthLabel(d.history[0].month, 'short')} to ${monthLabel(month, 'short')}`} value={<AnimatedNumber value={d.sum6} format={m0} />}
        sub={limit > 0 ? `${d.over6} of ${d.history.length} months over the ${m0(limit)} monthly limit` : 'No monthly limit set'}>
        <div className="px-5 pb-4"><MonthBars data={d.history} currency={currency} limit={limit} active={d.history.length - 1} /></div>
      </ChartCard>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader title="By category" />
          {d.cats.length === 0 ? <Empty title={`${none} or ${prevLabel}`} text="Each category is listed here with its change from the month before." /> : (
            <>
              <TableHead><span className="flex-1">Category</span><span className="w-16 sm:w-24 text-right">This month</span><span className="w-[84px] sm:w-24 text-right">vs last month</span></TableHead>
              {d.cats.map(c => (
                <TableRow key={c.category.id}>
                  <CategoryBadge category={c.category} />
                  <span className="flex-1 min-w-0 truncate text-foreground">{c.category.name}</span>
                  <span className="w-16 sm:w-24 text-right text-foreground tabular-nums">{m0(c.amount)}</span>
                  <span className="w-[84px] sm:w-24 text-right text-muted-foreground tabular-nums">{c.delta === 0 ? '—' : `${c.delta > 0 ? '+' : '−'}${m0(Math.abs(c.delta))}`}</span>
                </TableRow>
              ))}
            </>
          )}
        </Card>
        <Card>
          <CardHeader title="Top merchants" />
          {d.merchants.length === 0 ? <Empty title={none} text="The five names with the highest total are listed here." /> : (
            <>
              <TableHead><span className="flex-1">Merchant</span><span className="w-20 text-right">Expenses</span><span className="w-24 text-right">Total</span></TableHead>
              {d.merchants.map(m => (
                <TableRow key={m.name}>
                  <span className="h-6 w-6 rounded-md bg-muted text-muted-foreground text-xs inline-flex items-center justify-center shrink-0 uppercase">{m.name.charAt(0)}</span>
                  <span className="flex-1 min-w-0 truncate text-foreground">{m.name}</span>
                  <span className="w-20 text-right text-muted-foreground tabular-nums">{m.count}</span>
                  <span className="w-24 text-right text-foreground tabular-nums">{m2(m.amount)}</span>
                </TableRow>
              ))}
            </>
          )}
        </Card>
      </div>

      {d.top.avg === 0 ? (
        <Card><CardHeader title="By weekday" /><Empty title="No expenses in the last 3 months" text="The average spent on each weekday is shown here." /></Card>
      ) : (
        <ChartCard label="Highest weekday, last 3 months" value={d.top.name} sub={`${m2(d.top.avg)} a day on average`}>
          <div className="px-5 pb-4 grid grid-cols-7 gap-2 h-44">
            {d.weekday.map(w => (
              <div key={w.name} className="flex flex-col items-center justify-end gap-1.5 min-w-0">
                <span className="text-xs text-muted-foreground tabular-nums">{m0(w.avg)}</span>
                <div className="w-full max-w-12 rounded-t-[4px]" style={{ height: `${Math.max(2, (w.avg / d.top.avg) * 100)}px`, background: w === d.top ? 'var(--chart)' : 'var(--chart-soft)' }} />
                <span className="text-xs text-muted-foreground">{w.name.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      <MetricTray cols={4}>
        <Metric label="Biggest expense" icon={<ArrowUpRightIcon />} value={d.biggest ? <AnimatedNumber value={d.biggest.amount} format={m0} /> : '—'} sub={d.biggest?.name ?? none} />
        <Metric label="Average per expense" icon={<ChartBarIcon />} value={<AnimatedNumber value={d.exps.length ? d.st.spent / d.exps.length : 0} format={m2} />} sub={monthLabel(month)} />
        <Metric label="Expenses" icon={<HashtagIcon />} value={<AnimatedNumber value={d.exps.length} format={n => String(Math.round(n))} />} sub={monthLabel(month)} />
        <Metric label="No-spend days" icon={<MoonIcon />} value={<AnimatedNumber value={d.noSpend} format={n => String(Math.round(n))} />} sub={`of ${d.st.dayOfMonth} ${d.st.dayOfMonth === 1 ? 'day' : 'days'}`} />
      </MetricTray>
    </div>
  )
}
