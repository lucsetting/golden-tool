import { useState } from 'react'
import { ChartPieIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { hasModule } from '../lib/access'
import { MODULES } from '../lib/modules'
import { byCategory, expensesForMonth } from '../lib/calc'
import { fmt } from '../lib/money'
import { Metric, MetricTray, PageHeader, Select } from '../components/ui'
import Locked from '../components/Locked'
import CategoryBudgets from '../components/pro/CategoryBudgets'
import YearlyReport from '../components/pro/Reports'
import Export from '../components/reports/Export'

export default function Reports() {
  const tab = useUI(s => s.tab)
  const unlocked = useStore(s => hasModule(s.settings, 'reports'))
  const expenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const month = useUI(s => s.month)
  const currency = useStore(s => s.settings.currency)
  const thisYear = String(new Date().getFullYear())
  const [year, setYear] = useState(thisYear)
  const f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })

  if (!unlocked) {
    return (
      <Locked module={MODULES.reports} icon={<ChartPieIcon />} subtitle="A cap per category. The bar turns red before you overspend.">
        <CategoryBudgets />
      </Locked>
    )
  }

  if (tab === 'reports-yearly') {
    const years = [...new Set([thisYear, ...expenses.map(e => e.date.slice(0, 4))])].sort().reverse()
    return (
      <>
        <PageHeader title="Yearly report" subtitle="Twelve months side by side." actions={<div className="w-32"><Select value={year} onChange={e => setYear(e.target.value)} aria-label="Year">{years.map(y => <option key={y}>{y}</option>)}</Select></div>} />
        <YearlyReport year={year} />
      </>
    )
  }
  if (tab === 'reports-export') {
    return (
      <>
        <PageHeader title="Export" subtitle="Your data, in a spreadsheet or a backup." />
        <Export />
      </>
    )
  }

  const spent = new Map(byCategory(expensesForMonth(expenses, month), categories).map(s => [s.category.id, s.amount]))
  const budgeted = categories.filter(c => c.budget)
  const budgetTotal = budgeted.reduce((s, c) => s + (c.budget ?? 0), 0)
  const spentIn = budgeted.reduce((s, c) => s + (spent.get(c.id) ?? 0), 0)
  const over = budgeted.filter(c => (spent.get(c.id) ?? 0) > (c.budget ?? 0)).length
  return (
    <>
      <PageHeader title="Budgets" subtitle="A cap per category. The bar turns red before you overspend." />
      <div className="space-y-4">
        <MetricTray className="sm:grid-cols-3">
          <Metric label="Categories over" value={over} tone={over ? 'bad' : undefined} />
          <Metric label="Budgeted total" value={f0(budgetTotal)} />
          <Metric label="Spent in budgeted" value={f0(spentIn)} />
        </MetricTray>
        <CategoryBudgets />
      </div>
    </>
  )
}
