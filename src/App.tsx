import React, { useEffect } from 'react'
import { useStore } from './store'
import { useUI, type Tab } from './ui-state'
import { isReadOnly } from './lib/access'
import Layout from './components/Layout'
import ExpenseSheet from './components/ExpenseSheet'
import AccessGate from './components/AccessGate'
import SetPassword from './components/SetPassword'
import Dashboard from './pages/Dashboard'
import Activity from './pages/Activity'
import Insights from './pages/Insights'
import CashFlow from './pages/CashFlow'
import Bills from './pages/Bills'
import Budgets from './pages/Budgets'
import StatementImport from './components/StatementImport'
import Debts from './pages/Debts'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import More from './pages/More'
import Refund from './pages/Refund'
import Onboarding from './pages/Onboarding'
import SignIn from './pages/SignIn'
import { useAccount } from './account'
import { startSync } from './lib/sync'
import { hasAccounts } from './lib/supabase'

const PAGES: Record<Tab, React.ComponentType> = {
  home: Dashboard, activity: Activity, cashflow: CashFlow, bills: Bills, budgets: Budgets, insights: Insights, refund: Refund,
  debts: Debts, 'debts-schedule': Debts,
  goals: Goals, 'goals-emergency': Goals,
  reports: Reports, 'reports-export': Reports,
  settings: Settings, 'settings-categories': Settings, 'settings-rules': Settings, 'settings-data': Settings, 'settings-billing': Settings, 'settings-refund': Settings,
  more: More,
}

export default function App() {
  const settings = useStore(s => s.settings)
  const applyRecurring = useStore(s => s.applyRecurring)
  const tab = useUI(s => s.tab)
  const readOnly = isReadOnly(settings)
  const ready = useAccount(s => s.ready)
  const synced = useAccount(s => s.synced)
  const session = useAccount(s => s.session)
  const needsPassword = useAccount(s => !!s.session && !s.session.user.user_metadata?.has_password)
  const [pwDismissed, setPwDismissed] = React.useState(false)

  useEffect(() => { useAccount.getState().init(); startSync() }, [])

  useEffect(() => {
    // Default is light regardless of the OS; 'system' only when the person picks it in Settings.
    const resolved = settings.theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : settings.theme
    document.documentElement.dataset.theme = resolved
  }, [settings.theme])
  useEffect(() => { if (!readOnly) applyRecurring() }, [applyRecurring, readOnly])

  if (hasAccounts && !ready) return <div className="min-h-full bg-background flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
  if (hasAccounts && !session) return <SignIn />
  if (hasAccounts && !synced) return <div className="min-h-full bg-background flex items-center justify-center text-sm text-muted-foreground">Loading your account…</div>
  if (!settings.onboarded) return <Onboarding />
  const Page = PAGES[tab]
  return (
    <Layout>
      <Page />
      {readOnly ? <AccessGate /> : <><ExpenseSheet /><StatementImport /></>}
      <SetPassword first open={needsPassword && !pwDismissed} onClose={() => setPwDismissed(true)} />
    </Layout>
  )
}
