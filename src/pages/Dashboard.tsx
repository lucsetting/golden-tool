import { useMemo } from 'react'
import { ArrowTrendingUpIcon, BanknotesIcon, CalendarDaysIcon, ClockIcon, PlusIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { byCategory, dailyCumulative, expensesForMonth, monthStats } from '../lib/calc'
import { currentMonthKey, dateLabel, fmt } from '../lib/money'
import { Button, Card, CardHeader, CategoryBadge, Empty, Metric, MetricTray, PageHeader } from '../components/ui'
import SetupCard from '../components/SetupCard'
import MonthPicker from '../components/MonthPicker'
import Breakdown from '../components/charts/Breakdown'
import SpendCurve from '../components/charts/SpendCurve'

export default function Dashboard() {
  const month = useUI(s => s.month)
  const setTab = useUI(s => s.setTab)
  const openSheet = useUI(s => s.openSheet)
  const settings = useStore(s => s.settings)
  const { currency, monthlyLimit } = settings
  const allExpenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)

  const exps = useMemo(() => expensesForMonth(allExpenses, month), [allExpenses, month])
  const st = useMemo(() => monthStats(exps, month, monthlyLimit), [exps, month, monthlyLimit])
  const slices = useMemo(() => byCategory(exps, categories), [exps, categories])
  const curve = useMemo(() => dailyCumulative(exps, month, monthlyLimit), [exps, month, monthlyLimit])
  const isCurrent = month === currentMonthKey()
  const m0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const monthName = new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1).toLocaleDateString('en-US', { month: 'short' })
  const tone = st.pace === 'over' ? 'bad' : st.pace === 'behind' ? 'warn' : 'good'

  let insight = 'Set a monthly limit in Settings to track your pace.'
  if (monthlyLimit > 0) {
    const gap = Math.round(Math.abs(st.expectedByNow - st.spent))
    if (!isCurrent) insight = st.spent > monthlyLimit ? `You finished ${m0(st.spent - monthlyLimit)} over your limit.` : `You finished ${m0(monthlyLimit - st.spent)} under your limit.`
    else if (!exps.length) insight = "Add your first expense to see how you're pacing."
    else if (st.spent > monthlyLimit) insight = `You're ${m0(st.spent - monthlyLimit)} over your limit with ${st.daysLeft} days to go.`
    else if (st.projected > monthlyLimit) insight = `At this pace you'll end the month at ${m0(st.projected)}, ${m0(st.projected - monthlyLimit)} over your limit.`
    else if (st.spent <= st.expectedByNow) insight = `You're ${m0(gap)} under pace. Keep it up.`
    else insight = `You're ${m0(gap)} ahead of pace, but still on track to finish under your limit.`
  }

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Home" subtitle={insight} actions={<><MonthPicker /><Button variant="primary" onClick={() => openSheet()}><PlusIcon />Add expense</Button></>} />

      <Card>
        <div className="p-5">
          <div className="text-sm text-muted-foreground">Spent this month</div>
          <div className="text-3xl text-foreground tabular-nums mt-3">{fmt(st.spent, currency)}</div>
          <div className="text-sm text-muted-foreground mt-3">{exps.length} {exps.length === 1 ? 'expense' : 'expenses'} · {m0(st.remaining)} left of {m0(monthlyLimit)}</div>
        </div>
        <SpendCurve data={curve} currency={currency} showIdeal={monthlyLimit > 0} monthName={monthName} />
      </Card>

      <MetricTray className="grid-cols-2 lg:grid-cols-4">
        <Metric label="Remaining" value={fmt(st.remaining, currency, { maximumFractionDigits: 0 })} tone={tone} icon={<BanknotesIcon />} />
        <Metric label="Safe to spend today" value={isCurrent ? fmt(st.safePerDay, currency, { maximumFractionDigits: 0 }) : '—'} icon={<CalendarDaysIcon />} />
        <Metric label="Projected" value={m0(st.projected)} sub={`limit ${m0(monthlyLimit)}`} icon={<ArrowTrendingUpIcon />} />
        <Metric label="Days left" value={st.daysLeft} icon={<ClockIcon />} />
      </MetricTray>

      <SetupCard />

      <Breakdown slices={slices} spent={st.spent} limit={monthlyLimit} currency={currency} />

      <Card>
        <CardHeader title="Recent" right={<Button variant="ghost" size="sm" onClick={() => setTab('activity')}>See all</Button>} />
        {exps.length ? exps.slice(0, 6).map(e => {
          const cat = categories.find(c => c.id === e.categoryId) ?? { id: 'other', name: 'Other', icon: 'Circle', color: '#8E919A' }
          return (
            <button key={e.id} onClick={() => openSheet(e.id)} className="t w-full h-14 px-4 flex items-center gap-3 text-left border-b border-border last:border-b-0 hover:bg-muted">
              <CategoryBadge category={cat} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-foreground truncate">{e.name}</span>
                <span className="block text-xs text-muted-foreground mt-1.5">{cat.name} · {dateLabel(e.date)}</span>
              </span>
              <span className="text-sm text-foreground tabular-nums">{fmt(e.amount, currency)}</span>
            </button>
          )
        }) : <Empty title="Nothing logged this month" />}
      </Card>
    </div>
  )
}
