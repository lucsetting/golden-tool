import { AddonPage, type Screens } from '../components/Locked'
import Trends from '../components/pro/Trends'
import NetWorth from '../components/pro/NetWorth'
import YearlyReport from '../components/pro/Reports'
import BudgetReport from '../components/pro/BudgetReport'
import Export from '../components/reports/Export'

const SCREENS: Screens = {
  reports: ['Trends', 'Which costs are creeping up, and where the year ends if nothing changes.', Trends],
  'reports-networth': ['Net worth', 'What you own minus what you owe, month by month.', NetWorth],
  'reports-yearly': ['Yearly', 'Twelve months side by side, the year before, and every day of the year.', YearlyReport],
  'reports-budget': ['Budget report', 'Which budgets held over the last six months, and which did not.', BudgetReport],
  'reports-export': ['Export', 'Your data, in a spreadsheet or a backup.', Export],
}

export default function Reports() {
  return <AddonPage kind="reports" screens={SCREENS} />
}
