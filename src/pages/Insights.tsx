import { useMemo } from 'react'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { byCategory, expensesForMonth, monthStats, monthlyHistory, total } from '../lib/calc'
import { currentMonthKey, daysInMonth, fmt, monthLabel, shiftMonth, todayISO } from '../lib/money'
import { Card, CardHeader, CategoryBadge, Chip, Empty, Metric, MetricTray, PageHeader } from '../components/ui'
import MonthPicker from '../components/MonthPicker'
import MonthBars from '../components/pro/MonthBars'

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Insights() {
  const month = useUI(s => s.month)
  const { currency, monthlyLimit } = useStore(s => s.settings)
  const all = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const m0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const m2 = (n: number) => fmt(n, currency)

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
        return { category, amount, before, delta: amount - before }
      }).sort((a, b) => b.amount - a.amount || b.before - a.before)
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
    const st = monthStats(exps, month, monthlyLimit)
    const pool = history.filter(h => h.spent > 0)
    return {
      exps, history, cats, weekday, st,
      prevTotal: total(prevExps),
      avg: pool.length ? pool.reduce((s, h) => s + h.spent, 0) / pool.length : 0,
      merchants: [...merchants.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
      biggest: exps.reduce<typeof exps[number] | undefined>((b, e) => (!b || e.amount > b.amount ? e : b), undefined),
      noSpend: Math.max(0, st.dayOfMonth - new Set(exps.map(e => e.date)).size),
    }
  }, [all, categories, month, monthlyLimit])

  const header = <PageHeader title="Insights" subtitle={`${monthLabel(month)} vs ${monthLabel(shiftMonth(month, -1))}`} actions={<MonthPicker />} />
  if (!d.exps.length && !d.prevTotal) return <>{header}<Card><Empty title="Nothing to analyze yet" text={`No expenses in ${monthLabel(month)}. Log a few and insights will appear here.`} /></Card></>

  const pct = d.prevTotal ? Math.round(((d.st.spent - d.prevTotal) / d.prevTotal) * 100) : null
  const maxAvg = Math.max(...d.weekday.map(w => w.avg), 1)
  const topDay = d.weekday.reduce((b, w, i) => (w.avg > d.weekday[b].avg ? i : b), 0)

  return (
    <div className="space-y-6 pb-6">
      {header}
      <MetricTray className="sm:grid-cols-3">
        <Metric label="This month" value={m0(d.st.spent)} sub={pct === null ? undefined : <Chip tone={pct <= 0 ? 'good' : 'bad'}>{pct > 0 ? '+' : ''}{pct}% vs last month</Chip>} />
        <Metric label="Last month" value={m0(d.prevTotal)} sub={monthLabel(shiftMonth(month, -1))} />
        <Metric label="Monthly average" value={m0(d.avg)} sub="Last 6 months with data" />
      </MetricTray>

      <Card>
        <CardHeader title="Last 6 months" right={<span className="text-sm text-muted-foreground">Limit {m0(monthlyLimit)}</span>} />
        <div className="p-4"><MonthBars data={d.history} currency={currency} limit={monthlyLimit} active={d.history.length - 1} /></div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="By category" />
          {d.cats.length === 0 ? <Empty /> : d.cats.map(c => (
            <div key={c.category.id} className="h-[60px] px-4 flex items-center gap-3 border-b border-border last:border-b-0">
              <CategoryBadge category={c.category} size={24} />
              <span className="flex-1 min-w-0 truncate text-sm">{c.category.name}</span>
              <span className="text-sm tabular-nums">{m0(c.amount)}</span>
              <span className="w-20 flex justify-end">
                {c.delta === 0 ? <Chip>0</Chip> : <Chip tone={c.delta < 0 ? 'good' : 'bad'}>{c.delta > 0 ? '+' : '-'}{m0(Math.abs(c.delta))}</Chip>}
              </span>
            </div>
          ))}
        </Card>
        <Card>
          <CardHeader title="Top merchants" />
          {d.merchants.length === 0 ? <Empty /> : d.merchants.map(m => (
            <div key={m.name} className="h-[60px] px-4 flex items-center gap-3 border-b border-border last:border-b-0">
              <span className="h-6 w-6 rounded-md bg-muted text-muted-foreground text-xs inline-flex items-center justify-center shrink-0 uppercase">{m.name.charAt(0)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{m.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.count} {m.count === 1 ? 'expense' : 'expenses'}</div>
              </div>
              <span className="text-sm tabular-nums">{m2(m.amount)}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <CardHeader title="By weekday" right={<span className="text-sm text-muted-foreground">Average, last 3 months</span>} />
        <div className="p-4 grid grid-cols-7 gap-2 h-40">
          {d.weekday.map((w, i) => (
            <div key={w.name} className="flex flex-col items-center justify-end gap-2 min-w-0" title={m2(w.avg)}>
              <div className="w-full max-w-6 flex-1 flex items-end">
                <div className="t w-full rounded-t-sm" style={{ height: `${Math.max(2, (w.avg / maxAvg) * 100)}%`, background: i === topDay && w.avg > 0 ? 'var(--gold)' : 'var(--muted-2)' }} />
              </div>
              <span className="text-xs text-muted-foreground">{w.name}</span>
            </div>
          ))}
        </div>
      </Card>

      <MetricTray className="grid-cols-2 lg:grid-cols-4">
        <Metric label="Biggest purchase" value={d.biggest ? m0(d.biggest.amount) : '-'} sub={d.biggest?.name} />
        <Metric label="Avg per expense" value={m2(d.exps.length ? d.st.spent / d.exps.length : 0)} />
        <Metric label="Expenses" value={d.exps.length} />
        <Metric label="No-spend days" value={d.noSpend} />
      </MetricTray>
    </div>
  )
}
