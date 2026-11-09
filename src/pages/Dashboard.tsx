import { useMemo } from 'react'
import { ArrowTrendingUpIcon, BanknotesIcon, CalendarDaysIcon, ClockIcon, PlusIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { byCategory, dailyCumulative, expensesForMonth, monthStats } from '../lib/calc'
import { currentMonthKey, dateLabel, fmt, monthLabel } from '../lib/money'
import { AnimatedNumber, Button, Card, CardHeader, CategoryBadge, Empty, Metric, MetricTray, PageHeader, TableRow } from '../components/ui'
import SetupCard from '../components/SetupCard'
import MonthPicker from '../components/MonthPicker'
import Breakdown from '../components/charts/Breakdown'
import ChartCard from '../components/charts/ChartCard'
import SpendCurve from '../components/charts/SpendCurve'

const Key = ({ color, children }: { color: string; children: string }) => (
  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{children}</span>
)

export default function Dashboard() {
  const month = useUI(s => s.month)
  const setTab = useUI(s => s.setTab)
  const openSheet = useUI(s => s.openSheet)
  const currency = useStore(s => s.settings.currency)
  const limit = useStore(s => s.settings.monthlyLimit)
  const allExpenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const recurring = useStore(s => s.recurring)

  const exps = useMemo(() => expensesForMonth(allExpenses, month), [allExpenses, month])
  const st = useMemo(() => monthStats(exps, month, limit, recurring), [exps, month, limit, recurring])
  const slices = useMemo(() => byCategory(exps, categories), [exps, categories])
  const curve = useMemo(() => dailyCumulative(exps, month, limit, recurring), [exps, month, limit, recurring])
  const isCurrent = month === currentMonthKey()
  const m0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const [monthName, year] = monthLabel(month).split(' ')
  const short = monthLabel(month, 'short').split(' ')[0]
  const over = limit > 0 && st.spent > limit
  const count = `${exps.length} ${exps.length === 1 ? 'expense' : 'expenses'}`
  const versus = (n: number) => `${m0(Math.abs(n - limit))} ${n > limit ? 'over' : 'under'}`

  let insight = 'Set a monthly limit in Settings to see your pace.'
  if (limit > 0) {
    if (!isCurrent) insight = `You finished ${versus(st.spent)} your limit.`
    else if (!exps.length) insight = `No expenses in ${monthName} yet.`
    else if (over) insight = `You're ${m0(st.spent - limit)} over your limit with ${st.daysLeft} days to go.`
    else insight = `At this pace you'll end the month at ${m0(st.projected)}, ${versus(st.projected)} your limit.`
  }

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Home" subtitle={insight} actions={<><MonthPicker /><Button variant="primary" className="max-lg:hidden" onClick={() => openSheet()}><PlusIcon />Add expense</Button></>} />

      <MetricTray cols={4}>
        <Metric label="Remaining" icon={<BanknotesIcon />} tone={over ? 'bad' : undefined}
          value={limit > 0 ? <AnimatedNumber value={st.remaining} format={m0} /> : '—'} sub={limit > 0 ? `of ${m0(limit)}` : 'No monthly limit'} />
        <Metric label="Safe to spend today" icon={<CalendarDaysIcon />}
          value={isCurrent && limit > 0 ? <AnimatedNumber value={st.safePerDay} format={m0} /> : '—'} sub={isCurrent ? 'per day' : 'Month ended'} />
        <Metric label="Projected" icon={<ArrowTrendingUpIcon />}
          value={<AnimatedNumber value={st.projected} format={m0} />} sub={limit > 0 ? `limit ${m0(limit)}` : `by ${short} ${st.daysInMonth}`} />
        <Metric label="Days left" icon={<ClockIcon />} value={<AnimatedNumber value={st.daysLeft} format={n => String(Math.round(n))} />} sub={`in ${monthName}`} />
      </MetricTray>

      <SetupCard />

      {exps.length === 0 ? (
        <Card>
          <Empty title={`No expenses in ${monthName} ${year} yet`} text="Add an expense and this page shows your spending by day, by category and your latest entries."
            action={<Button variant="primary" onClick={() => openSheet()}><PlusIcon />Add expense</Button>} />
        </Card>
      ) : (
        <>
          <ChartCard label={`Spent in ${monthName}`} value={<AnimatedNumber value={st.spent} format={n => fmt(n, currency)} />}
            sub={limit <= 0 ? count : isCurrent ? `${count} · ${m0(Math.abs(st.spent - st.expectedByNow))} ${st.spent > st.expectedByNow ? 'over' : 'under'} the limit pace` : `${count} · ${st.pctUsed}% of the ${m0(limit)} monthly limit`}
            right={limit > 0 && <div className="flex gap-4 text-xs text-muted-foreground"><Key color={over ? 'var(--destructive)' : 'var(--chart)'}>Spent</Key><Key color="var(--chart-soft)">Limit pace</Key></div>}>
            <SpendCurve data={curve} currency={currency} showPace={limit > 0} over={over} monthName={short} />
          </ChartCard>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Breakdown slices={slices} spent={st.spent} currency={currency} />
            <Card>
              <CardHeader title="Recent" right={<Button variant="ghost" size="sm" onClick={() => setTab('activity')}>See all</Button>} />
              {exps.slice(0, 6).map(e => {
                const cat = categories.find(c => c.id === e.categoryId) ?? { id: 'other', name: 'Other', icon: 'Circle', color: '#8E919A' }
                return (
                  <TableRow key={e.id} onClick={() => openSheet(e.id)}>
                    <CategoryBadge category={cat} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-foreground truncate">{e.name}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{cat.name} · {dateLabel(e.date)}</span>
                    </span>
                    <span className="text-foreground tabular-nums">{fmt(e.amount, currency)}</span>
                  </TableRow>
                )
              })}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
