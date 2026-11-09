import { useStore } from '../store'
import { useUI } from '../ui-state'
import { hasModule } from '../lib/access'
import { MODULES } from '../lib/modules'
import { PageHeader } from '../components/ui'
import Locked from '../components/Locked'
import CategoryBudgets from '../components/pro/CategoryBudgets'
import YearlyReport from '../components/pro/Reports'
import Export from '../components/reports/Export'

export default function Reports() {
  const tab = useUI(s => s.tab)
  const unlocked = useStore(s => hasModule(s.settings, 'reports'))
  const [title, subtitle] = tab === 'reports-yearly' ? ['Yearly report', 'Twelve months side by side, with the total, the monthly average and the categories.']
    : tab === 'reports-export' ? ['Export', 'Your data, in a spreadsheet or a backup.']
    : ['Budgets', 'One budget per category per month. The bar turns red when a category goes over.']
  const body = tab === 'reports-yearly' ? <YearlyReport /> : tab === 'reports-export' ? <Export /> : <CategoryBudgets />
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      {unlocked ? body : <Locked module={MODULES.reports}>{body}</Locked>}
    </>
  )
}
