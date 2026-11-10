import { useMemo, useState } from 'react'
import { PlusIcon, ShieldCheckIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { fmt, plural } from '../lib/money'
import { ESSENTIALS, essentialsPerMonth } from '../lib/calc'
import { monthlyNeed } from '../lib/goals'
import { AnimatedNumber, Button, Card, CardHeader, CategoryBadge, Empty, Metric, MetricTray, ProgressRing, Segmented, Select, TableRow } from '../components/ui'
import { AddonPage, type Screens } from '../components/Locked'
import GoalList from '../components/pro/Goals'
import GoalPlan from '../components/pro/GoalPlan'
import Challenges from '../components/pro/Challenges'
import { GOAL_COLOR, useGoals, useSafeToSave } from '../components/goals/shared'

const EF_KEY = 'golden-tool:ef-goal'
const EF_NAME = 'Emergency fund'
const readEf = () => { try { return localStorage.getItem(EF_KEY) ?? '' } catch { return '' } }

function GoalsTab() {
  const { goals, currency } = useGoals()
  const { safe } = useSafeToSave()
  const m0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  return (
    <GoalList tray={
      <MetricTray>
        <Metric label="Safe to save" value={<AnimatedNumber value={safe} format={m0} />} sub="This month, under the monthly limit" />
        <Metric label="Saved so far" value={<AnimatedNumber value={goals.reduce((s, g) => s + g.saved, 0)} format={m0} />} sub={plural(goals.length, 'goal')} />
        <Metric label="Needed per month" value={<AnimatedNumber value={goals.reduce((s, g) => s + monthlyNeed(g), 0)} format={m0} />} sub="To meet every deadline" />
      </MetricTray>
    } />
  )
}

function EmergencyTab() {
  const { goals, currency } = useGoals()
  const categories = useStore(s => s.categories)
  const expenses = useStore(s => s.expenses)
  const ess = useMemo(() => essentialsPerMonth(expenses), [expenses])
  const sts = useSafeToSave().safe
  const [months, setMonths] = useState<'3' | '6'>('3')
  const [efId, setEfId] = useState(readEf)
  const pick = (id: string) => { setEfId(id); try { localStorage.setItem(EF_KEY, id) } catch { /* private mode: selection lasts this session */ } }
  const m0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const f = (n: number) => fmt(n, currency)
  const n = Number(months)
  const target = ess * n
  // The choice is kept in this browser only. On another device the goal this screen creates is found by its name.
  const goal = goals.find(g => g.id === efId) ?? goals.find(g => g.name === EF_NAME)
  const create =() => pick(useStore.getState().addTo('goals', { name: EF_NAME, target, color: GOAL_COLOR }).id)
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

const SCREENS: Screens = {
  goals: ['Goals', 'Open a goal for its contributions, its pace against the deadline and its milestones.', GoalsTab],
  'goals-plan': ['Plan', 'What you can save this month, split over your goals in the order that matters to you.', GoalPlan],
  'goals-challenges': ['Challenges', 'A fixed pattern to follow for a while: 52 weeks of growing amounts, or seven days without extras.', Challenges],
  'goals-emergency': ['Emergency fund', 'Three to six months of essential expenses, from what you actually spend.', EmergencyTab],
}

export default function Goals() {
  return <AddonPage kind="goals" screens={SCREENS} />
}
