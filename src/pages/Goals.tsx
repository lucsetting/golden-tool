import { useMemo, useState } from 'react'
import { PlusIcon, ShieldCheckIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { hasModule } from '../lib/access'
import { MODULES } from '../lib/modules'
import { currentMonthKey, fmt } from '../lib/money'
import { essentialsPerMonth, expensesForMonth, monthStats, safeToSave } from '../lib/calc'
import { AnimatedNumber, Button, Card, CardHeader, CategoryBadge, Empty, Metric, MetricTray, PageHeader, ProgressRing, Segmented, Select, TableRow } from '../components/ui'
import Locked from '../components/Locked'
import GoalList, { GOAL_COLOR, monthlyNeed } from '../components/pro/Goals'

const ESSENTIALS = ['housing', 'bills', 'groceries', 'transport', 'health']
const EF_KEY = 'golden-tool:ef-goal'
const readEf = () => { try { return localStorage.getItem(EF_KEY) ?? '' } catch { return '' } }

function useNumbers() {
  const expenses = useStore(s => s.expenses)
  const limit = useStore(s => s.settings.monthlyLimit)
  const currency = useStore(s => s.settings.currency)
  const recurring = useStore(s => s.recurring)
  return useMemo(() => {
    const mk = currentMonthKey()
    const ess = essentialsPerMonth(expenses)
    return { currency, expenses, ess, sts: safeToSave(monthStats(expensesForMonth(expenses, mk), mk, limit, recurring)) }
  }, [expenses, limit, currency, recurring])
}

function GoalsTab() {
  const goals = useStore(s => s.goals)
  const { currency, sts } = useNumbers()
  const m0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  return (
    <div className="space-y-6">
      <MetricTray>
        <Metric label="Safe to save" value={<AnimatedNumber value={sts} format={m0} />} sub="This month, under the monthly limit" />
        <Metric label="Saved so far" value={<AnimatedNumber value={goals.reduce((s, g) => s + g.saved, 0)} format={m0} />} sub={`${goals.length} goal${goals.length === 1 ? '' : 's'}`} />
        <Metric label="Needed per month" value={<AnimatedNumber value={goals.reduce((s, g) => s + monthlyNeed(g), 0)} format={m0} />} sub="To meet every deadline" />
      </MetricTray>
      <GoalList />
    </div>
  )
}

function EmergencyTab() {
  const goals = useStore(s => s.goals)
  const categories = useStore(s => s.categories)
  const { currency, expenses, ess, sts } = useNumbers()
  const [months, setMonths] = useState<'3' | '6'>('3')
  const [efId, setEfId] = useState(readEf)
  const pick = (id: string) => { setEfId(id); try { localStorage.setItem(EF_KEY, id) } catch { /* private mode: selection lasts this session */ } }
  const m0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const f = (n: number) => fmt(n, currency)
  const n = Number(months)
  const target = ess * n
  const goal = goals.find(g => g.id === efId)
  const create = () => pick(useStore.getState().addGoal({ name: 'Emergency fund', target, saved: 0, color: GOAL_COLOR }).id)
  const pct = goal && target > 0 ? Math.min(100, Math.round((goal.saved / target) * 100)) : 0
  const left = goal ? Math.max(0, target - goal.saved) : 0

  return (
    <div className="space-y-6">
      <MetricTray>
        <Metric label="Essentials per month" value={<AnimatedNumber value={ess} format={m0} />} sub="3-month average" />
        <Metric label="3-month target" value={<AnimatedNumber value={ess * 3} format={m0} />} sub="Essentials × 3" />
        <Metric label="6-month target" value={<AnimatedNumber value={ess * 6} format={m0} />} sub="Essentials × 6" />
      </MetricTray>
      <Card>
        <CardHeader title="Your fund" icon={<ShieldCheckIcon className="h-4 w-4 text-muted-foreground shrink-0" />} />
        {ess <= 0 ? (
          <Empty title="No essential expenses yet" text="The target is the 3-month average of the categories listed below. Add expenses in those categories to get a target." action={<Button variant="primary" className="max-sm:px-4" onClick={() => useUI.getState().openSheet()}><PlusIcon /><span>Add expense</span></Button>} />
        ) : (
          <>
            <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border">
              <Segmented value={months} onChange={setMonths} options={[{ value: '3', label: '3 months' }, { value: '6', label: '6 months' }]}
                className="max-sm:flex max-sm:w-full max-sm:[&>button]:flex-1" />
              {goals.length > 0 && (
                <div className="w-full sm:w-56">
                  <Select value={goal?.id ?? ''} onChange={e => pick(e.target.value)} aria-label="Goal that holds the emergency fund">
                    {!goal && <option value="" disabled>Use an existing goal</option>}
                    {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Select>
                </div>
              )}
            </div>
            {goal ? (
              <div className="p-4 sm:p-5 flex items-center gap-5 sm:gap-6 tabular-nums">
                <ProgressRing value={pct} size={104}><span className="text-lg">{pct}%</span></ProgressRing>
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">{n}-month fund</div>
                  <div className="text-2xl sm:text-3xl tracking-tight mt-2">{f(goal.saved)}</div>
                  <div className="text-sm text-muted-foreground mt-2">of {f(target)}</div>
                  <div className="text-sm text-muted-foreground mt-1">{left === 0 ? 'Funded' : sts > 0 ? `${Math.ceil(left / sts)} months to go at ${f(sts)} per month` : `${f(left)} to go`}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5">
                <p className="text-sm text-muted-foreground">No goal holds the emergency fund yet. {n} months of essentials is {m0(target)}.</p>
                <Button variant="primary" className="mt-4 max-sm:w-full" onClick={create}><PlusIcon /><span>Create emergency fund goal</span></Button>
              </div>
            )}
          </>
        )}
      </Card>
      <Card>
        <CardHeader title="Which categories count" right={<span className="text-xs text-muted-foreground">3-month average</span>} />
        {ESSENTIALS.map(id => {
          const cat = categories.find(c => c.id === id)
          return cat && (
            <TableRow key={id}>
              <CategoryBadge category={cat} />
              <span className="flex-1 text-foreground truncate">{cat.name}</span>
              <span className="text-muted-foreground tabular-nums">{m0(essentialsPerMonth(expenses, [id]))}</span>
            </TableRow>
          )
        })}
      </Card>
    </div>
  )
}

export default function Goals() {
  const emergency = useUI(s => s.tab === 'goals-emergency')
  const unlocked = useStore(s => hasModule(s.settings, 'goals'))
  const body = emergency ? <EmergencyTab /> : <GoalsTab />
  return (
    <>
      {emergency
        ? <PageHeader title="Emergency fund" subtitle="Three to six months of essential expenses, from what you actually spend." />
        : <PageHeader title="Goals" subtitle="Each goal shows the amount to set aside per month." />}
      {unlocked ? body : <Locked module={MODULES.goals}>{body}</Locked>}
    </>
  )
}
