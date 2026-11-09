import { useMemo, useState } from 'react'
import { FlagIcon, PlusIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { hasModule } from '../lib/access'
import { MODULES } from '../lib/modules'
import { currentMonthKey, fmt } from '../lib/money'
import { essentialsPerMonth, expensesForMonth, monthStats, safeToSave } from '../lib/calc'
import { Button, Card, CardHeader, CategoryBadge, Metric, MetricTray, PageHeader, ProgressRing, Segmented, Select } from '../components/ui'
import Locked from '../components/Locked'
import GoalsGrid, { monthlyNeed, type GoalSheet } from '../components/pro/Goals'
import type { Goal } from '../types'

const ESSENTIALS = ['housing', 'bills', 'groceries', 'transport', 'health']
const EF_KEY = 'golden-tool:ef-goal'
const readEf = () => { try { return localStorage.getItem(EF_KEY) ?? '' } catch { return '' } }

function useNumbers() {
  const expenses = useStore(s => s.expenses)
  const limit = useStore(s => s.settings.monthlyLimit)
  const currency = useStore(s => s.settings.currency)
  return useMemo(() => {
    const mk = currentMonthKey()
    const ess = essentialsPerMonth(expenses)
    return { currency, expenses, ess, sts: safeToSave(monthStats(expensesForMonth(expenses, mk), mk, limit)) }
  }, [expenses, limit, currency])
}

function Progress({ goal, target, months, sts, currency }: { goal: Goal; target: number; months: number; sts: number; currency: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((goal.saved / target) * 100)) : 0
  const left = Math.max(0, target - goal.saved)
  const eta = left === 0 ? 'Funded' : sts > 0 ? `${Math.ceil(left / sts)} months to go at ${fmt(sts, currency)}/month` : '—'
  return (
    <div className="p-5 flex items-center gap-6">
      <ProgressRing value={pct} size={120} ><span className="text-xl tabular-nums">{pct}%</span></ProgressRing>
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{months}-month fund</div>
        <div className="text-2xl tabular-nums mt-2">{fmt(goal.saved, currency)} <span className="text-sm text-muted-foreground">of {fmt(target, currency)}</span></div>
        <div className="text-sm text-muted-foreground mt-3">{eta}</div>
      </div>
    </div>
  )
}

function GoalsTab({ headless }: { headless?: boolean } = {}) {
  const goals = useStore(s => s.goals)
  const { currency, sts } = useNumbers()
  const [sheet, setSheet] = useState<GoalSheet>(null)
  const m0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  return (
    <div className="space-y-6 pb-6">
      {!headless && <PageHeader title="Goals" subtitle="Each goal tells you what to set aside this month." actions={<Button variant="primary" onClick={() => setSheet({})}><PlusIcon />Add goal</Button>} />}
      <MetricTray>
        <Metric label="Safe to save this month" value={m0(sts)} />
        <Metric label="Saved so far" value={m0(goals.reduce((s, g) => s + g.saved, 0))} />
        <Metric label="Needed per month" value={m0(goals.reduce((s, g) => s + monthlyNeed(g), 0))} />
      </MetricTray>
      <GoalsGrid sheet={sheet} setSheet={setSheet} />
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
  const n = Number(months)
  const target = ess * n
  const goal = goals.find(g => g.id === efId)
  const create = () => pick(useStore.getState().addGoal({ name: 'Emergency fund', target, saved: 0, color: '#E0B13A' }).id)
  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Emergency fund" subtitle="Three to six months of essentials, calculated from what you actually spend." />
      <Card>
        <CardHeader title="Your target" />
        <MetricTray>
          <Metric label="Essentials per month" value={m0(ess)} />
          <Metric label="3-month target" value={m0(ess * 3)} />
          <Metric label="6-month target" value={m0(ess * 6)} />
        </MetricTray>
      </Card>
      <Card>
        <CardHeader title="Your progress" right={<Segmented value={months} onChange={setMonths} options={[{ value: '3', label: '3 months' }, { value: '6', label: '6 months' }]} />} />
        {goal ? (
          <>
            <div className="px-5 pt-5 max-w-xs">
              <Select value={goal.id} onChange={e => pick(e.target.value)} aria-label="Emergency fund goal">
                {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </div>
            <Progress goal={goal} target={target} months={n} sts={sts} currency={currency} />
          </>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">{ess > 0 ? `Create a goal worth ${m0(target)} or pick one you already have.` : 'Log some essential expenses first, then create your fund.'}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" disabled={ess <= 0} onClick={create}><PlusIcon />Create emergency fund goal</Button>
              {goals.length > 0 && (
                <Select value="" onChange={e => pick(e.target.value)} className="max-w-xs" aria-label="Use an existing goal">
                  <option value="" disabled>Use an existing goal</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              )}
            </div>
          </div>
        )}
      </Card>
      <Card>
        <CardHeader title="Which categories count" right={<span className="text-xs text-muted-foreground">3-month average</span>} />
        {ESSENTIALS.map(id => {
          const cat = categories.find(c => c.id === id)
          if (!cat) return null
          return (
            <div key={id} className="h-14 px-4 flex items-center gap-3 border-b border-border last:border-b-0">
              <CategoryBadge category={cat} size={32} />
              <span className="flex-1 text-sm text-foreground">{cat.name}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{fmt(essentialsPerMonth(expenses, [id]), currency, { maximumFractionDigits: 0 })}</span>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

export default function Goals() {
  const tab = useUI(s => s.tab)
  const unlocked = useStore(s => hasModule(s.settings, 'goals'))
  if (!unlocked) {
    return (
      <Locked module={MODULES.goals} icon={<FlagIcon />} subtitle="Each goal tells you what to set aside this month.">
        <GoalsTab headless />
      </Locked>
    )
  }
  return tab === 'goals-emergency' ? <EmergencyTab /> : <GoalsTab />
}
