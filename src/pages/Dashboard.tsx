import { useEffect, useMemo } from 'react'
import { ArrowsRightLeftIcon, BanknotesIcon, CalendarDaysIcon, FireIcon, PlusIcon, ReceiptPercentIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { useCarried } from '../components/pro/carry'
import { OTHER, budgetState, byCategory, cashFlow, dailyCumulative, dueSoon, expensesForMonth, monthStats, streak, weeklyRecap } from '../lib/calc'
import { currentMonthKey, dateLabel, fmt, monthLabel, todayISO } from '../lib/money'
import { AnimatedNumber, Button, Card, CardHeader, CategoryBadge, Empty, Metric, MetricTray, PageHeader, ProgressBar, TableRow } from '../components/ui'
import SetupCard from '../components/SetupCard'
import MonthPicker from '../components/MonthPicker'
import Breakdown from '../components/charts/Breakdown'
import ChartCard, { LegendKey as Key } from '../components/charts/ChartCard'
import SpendCurve from '../components/charts/SpendCurve'

export default function Dashboard() {
  const month = useUI(s => s.month)
  const setTab = useUI(s => s.setTab)
  const openSheet = useUI(s => s.openSheet)
  const currency = useStore(s => s.settings.currency)
  const limit = useStore(s => s.settings.monthlyLimit)
  const allExpenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const recurring = useStore(s => s.recurring)
  const incomes = useStore(s => s.incomes)
  const longest = useStore(s => s.settings.longestStreak ?? 0)

  const exps = useMemo(() => expensesForMonth(allExpenses, month), [allExpenses, month])
  const st = useMemo(() => monthStats(exps, month, limit, recurring), [exps, month, limit, recurring])
  const slices = useMemo(() => byCategory(exps, categories), [exps, categories])
  const curve = useMemo(() => dailyCumulative(exps, month, limit, recurring), [exps, month, limit, recurring])
  const isCurrent = month === currentMonthKey()
  const today = todayISO()
  const cf = useMemo(() => cashFlow(incomes, allExpenses, month), [incomes, allExpenses, month])
  const recap = useMemo(() => weeklyRecap(allExpenses, categories, today), [allExpenses, categories, today])
  const due = useMemo(() => dueSoon(recurring, today), [recurring, today])
  const run = useMemo(() => streak(allExpenses, limit, recurring), [allExpenses, limit, recurring])
  const carried = useCarried(month)
  // The budgets closest to their ceiling this month, fullest first. A budget includes what it carried over.
  const budgets = useMemo(() => categories.filter(c => c.budget)
    .map(c => ({ c, budget: c.budget! + carried(c), spent: slices.find(s => s.category.id === c.id)?.amount ?? 0 }))
    .sort((a, b) => b.spent / b.budget - a.spent / a.budget).slice(0, 3), [categories, slices, carried])
  // Only the longest streak is stored; today's is worked out from the expenses.
  useEffect(() => { if (run.longest > longest) useStore.getState().updateSettings({ longestStreak: run.longest }) }, [run.longest, longest])
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
        <Metric label="Spent" icon={<ReceiptPercentIcon />}
          value={<AnimatedNumber value={st.spent} format={m0} />} sub={limit > 0 ? `${st.pctUsed}% of ${m0(limit)}` : count} />
        <Metric label="Left" icon={<BanknotesIcon />} tone={over ? 'bad' : undefined}
          value={limit > 0 ? <AnimatedNumber value={st.remaining} format={m0} /> : '—'} sub={limit <= 0 ? 'No monthly limit' : isCurrent ? `${st.daysLeft} ${st.daysLeft === 1 ? 'day' : 'days'} left in ${monthName}` : 'Month ended'} />
        <Metric label="Safe to spend today" icon={<CalendarDaysIcon />}
          value={isCurrent && limit > 0 ? <AnimatedNumber value={st.safePerDay} format={m0} /> : '—'} sub={isCurrent ? 'per day' : 'Month ended'} />
        <Metric label="Cash flow" icon={<ArrowsRightLeftIcon />} tone={cf.income > 0 && cf.net < 0 ? 'bad' : undefined}
          value={cf.income > 0 ? <AnimatedNumber value={cf.net} format={m0} /> : '—'} sub={cf.income > 0 ? `${cf.rate}% of ${m0(cf.income)} income left` : 'No income recorded'} />
      </MetricTray>

      {/* The streak mark is one of the three places gold is allowed. */}
      {isCurrent && limit > 0 && allExpenses.length > 0 && (
        <Card className="px-4 py-3 flex items-center gap-3">
          <span className="h-8 w-8 shrink-0 rounded-lg bg-gold-soft inline-flex items-center justify-center"><FireIcon className="h-4 w-4 text-gold" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-foreground">{run.days} {run.days === 1 ? 'day' : 'days'} in a row at or under the limit pace</div>
            <div className="text-xs text-muted-foreground mt-0.5">Longest: {Math.max(longest, run.longest)} {Math.max(longest, run.longest) === 1 ? 'day' : 'days'} · {run.months} {run.months === 1 ? 'month' : 'months'} in a row within the monthly limit</div>
          </div>
        </Card>
      )}

      <SetupCard />

      {exps.length === 0 ? (
        <Card>
          <Empty title={`No expenses in ${monthName} ${year} yet`} text="Add an expense and this page shows your spending by day, by category and your latest entries."
            action={<Button variant="primary" onClick={() => openSheet()}><PlusIcon />Add expense</Button>} />
        </Card>
      ) : (
          <ChartCard label={`Spent in ${monthName}`} value={<AnimatedNumber value={st.spent} format={n => fmt(n, currency)} />}
            sub={limit <= 0 ? count : isCurrent ? `${count} · ${m0(Math.abs(st.spent - st.expectedByNow))} ${st.spent > st.expectedByNow ? 'over' : 'under'} the limit pace` : `${count} · ${st.pctUsed}% of the ${m0(limit)} monthly limit`}
            right={limit > 0 && <div className="flex gap-4 text-xs text-muted-foreground"><Key color={over ? 'var(--destructive)' : 'var(--chart)'}>Spent</Key><Key color="var(--chart-soft)">Limit pace</Key></div>}>
            <SpendCurve data={curve} currency={currency} showPace={limit > 0} over={over} monthName={short} />
          </ChartCard>
      )}

          {/* What the next days hold: shown for the current month, with or without expenses in it. */}
          {isCurrent && (recap || recurring.length > 0 || budgets.length > 0) && (
            <div className="grid gap-6 items-start lg:[grid-auto-flow:column] lg:[grid-auto-columns:minmax(0,1fr)]">
              {recap && (
                <Card>
                  <CardHeader title="Last 7 days" right={<span className="text-sm text-muted-foreground tabular-nums">{recap.count} {recap.count === 1 ? 'expense' : 'expenses'}</span>} />
                  <div className="px-4 pt-4 pb-3">
                    <div className="text-2xl text-foreground tabular-nums tracking-tight">{fmt(recap.spent, currency)}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {recap.diff === 0 ? 'The same as the 7 days before.' : `${m0(Math.abs(recap.diff))} ${recap.diff > 0 ? 'more' : 'less'} than the 7 days before${recap.pct === null ? '' : ` (${recap.pct > 0 ? '+' : ''}${recap.pct}%)`}.`}
                    </div>
                  </div>
                  {recap.top && <TableRow className="border-t"><span className="text-muted-foreground w-28 shrink-0">Top category</span><span className="flex-1 min-w-0 flex items-center gap-2"><CategoryBadge category={recap.top.category} size={20} /><span className="truncate text-foreground">{recap.top.category.name}</span></span><span className="text-foreground tabular-nums">{fmt(recap.top.amount, currency)}</span></TableRow>}
                  {recap.biggest && <TableRow onClick={() => openSheet(recap.biggest!.id)}><span className="text-muted-foreground w-28 shrink-0">Biggest expense</span><span className="flex-1 min-w-0 truncate text-foreground">{recap.biggest.name}</span><span className="text-foreground tabular-nums">{fmt(recap.biggest.amount, currency)}</span></TableRow>}
                </Card>
              )}
              {recurring.length > 0 && (
                <Card>
                  <CardHeader title="Bills due soon" right={<Button variant="ghost" size="sm" onClick={() => setTab('bills')}>See all</Button>} />
                  {due.length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground">No bill is due in the next 7 days.</p>}
                  {due.slice(0, 4).map(({ bill, date }) => (
                    <TableRow key={bill.id + date}>
                      <CategoryBadge category={categories.find(c => c.id === bill.categoryId) ?? OTHER} size={32} />
                      <span className="min-w-0 flex-1"><span className="block text-foreground truncate">{bill.name}</span><span className="block text-xs text-muted-foreground mt-0.5">{dateLabel(date)}</span></span>
                      <span className="text-foreground tabular-nums">{fmt(bill.amount, currency)}</span>
                    </TableRow>
                  ))}
                  {due.length > 4 && <p className="px-4 py-3 text-xs text-muted-foreground">And {due.length - 4} more.</p>}
                </Card>
              )}
              {budgets.length > 0 && (
                <Card>
                  <CardHeader title="Budgets" right={<Button variant="ghost" size="sm" onClick={() => setTab('budgets')}>See all</Button>} />
                  {budgets.map(({ c, spent, budget }) => {
                    const state = budgetState(spent, budget)
                    return (
                      <TableRow key={c.id}>
                        <CategoryBadge category={c} size={32} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2"><span className="truncate text-foreground">{c.name}</span><span className={state === 'over' ? 'text-destructive tabular-nums' : state === 'warn' ? 'text-warn tabular-nums' : 'text-muted-foreground tabular-nums'}>{m0(spent)} of {m0(budget)}</span></span>
                          <ProgressBar className="mt-2" value={(spent / budget) * 100} tone={state === 'over' ? 'bad' : state === 'warn' ? 'warn' : undefined} />
                        </span>
                      </TableRow>
                    )
                  })}
                </Card>
              )}
            </div>
          )}

      {exps.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Breakdown slices={slices} spent={st.spent} currency={currency} />
            <Card>
              <CardHeader title="Recent" right={<Button variant="ghost" size="sm" onClick={() => setTab('activity')}>See all</Button>} />
              {exps.slice(0, 6).map(e => {
                const cat = categories.find(c => c.id === e.categoryId) ?? OTHER
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
      )}
    </div>
  )
}
