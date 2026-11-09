import { ArrowUturnLeftIcon, ChevronRightIcon, Cog6ToothIcon, LockClosedIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI, type Tab } from '../ui-state'
import { MODULES, type ModuleKind } from '../lib/modules'
import { hasModule } from '../lib/access'
import { Card, Chip, PageHeader, TableRow } from '../components/ui'
import { MODULE_ICON } from '../components/Layout'

const ABOUT: Record<ModuleKind, string> = { debts: 'Debt payoff plan', goals: 'Goals and emergency fund', reports: 'Budgets, yearly report and export' }
const tile = 'h-8 w-8 shrink-0 rounded-lg bg-muted text-foreground inline-flex items-center justify-center [&>svg]:h-4 [&>svg]:w-4'
const chevron = <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />

/** Phone only: everything that is not on the bottom bar. */
export default function More() {
  const setTab = useUI(s => s.setTab)
  const settings = useStore(s => s.settings)
  const links: [Tab, string, typeof Cog6ToothIcon][] = [['settings', 'Settings', Cog6ToothIcon], ['refund', 'Refund', ArrowUturnLeftIcon]]

  return (
    <>
      <PageHeader title="More" />
      <div className="space-y-6">
        <Card>
          {Object.values(MODULES).map(m => {
            const Icon = MODULE_ICON[m.kind]
            return (
              <TableRow key={m.kind} onClick={() => setTab(m.kind)} className="min-h-16!">
                <span className={tile}><Icon /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-foreground truncate">{m.name}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5 truncate">{ABOUT[m.kind]}</span>
                </span>
                {hasModule(settings, m.kind) ? <Chip tone="outline">Active</Chip> : <LockClosedIcon aria-label="Locked" className="h-4 w-4 shrink-0 text-muted-foreground" />}
                {chevron}
              </TableRow>
            )
          })}
        </Card>
        <Card>
          {links.map(([tab, label, Icon]) => (
            <TableRow key={tab} onClick={() => setTab(tab)}>
              <span className={tile}><Icon /></span>
              <span className="flex-1 text-foreground">{label}</span>
              {chevron}
            </TableRow>
          ))}
        </Card>
      </div>
    </>
  )
}
