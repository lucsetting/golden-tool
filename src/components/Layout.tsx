import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Squares2X2Icon, Cog6ToothIcon, HomeIcon, ListBulletIcon, ChartBarIcon, MoonIcon, SunIcon, PlusIcon, QuestionMarkCircleIcon, BookOpenIcon, CreditCardIcon, FlagIcon, ChartPieIcon, EllipsisHorizontalIcon, UserIcon, TagIcon, ArrowPathIcon, CircleStackIcon, CalendarDaysIcon, ShieldCheckIcon, TableCellsIcon, ArrowDownTrayIcon, LockClosedIcon, ArrowTopRightOnSquareIcon, ArrowUturnLeftIcon, BanknotesIcon, ChevronDownIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { SECTION_TABS, sectionOf, useUI, type Section, type Tab } from '../ui-state'
import { expensesForMonth, total } from '../lib/calc'
import { currentMonthKey, fmt } from '../lib/money'
import { LIFETIME, MODULES, type ModuleKind } from '../lib/modules'
import { daysLeft, hasModule, isLifetime, isReadOnly } from '../lib/access'
import { useAccount } from '../account'
import { hasAccounts } from '../lib/supabase'
import { Chip, Dialog, Menu, MenuItem, ProgressBar, Toaster, cx } from './ui'
import { QuickSearchButton } from './QuickSearch'
import '../lib/install'

type IconCmp = typeof HomeIcon
export const MODULE_ICON: Record<ModuleKind, IconCmp> = { debts: CreditCardIcon, goals: FlagIcon, reports: ChartPieIcon }
const RAIL: { section: Section; label: string; Icon: IconCmp; tab: Tab }[] = [
  { section: 'dashboard', label: 'Dashboard', Icon: Squares2X2Icon, tab: 'home' },
  { section: 'debts', label: MODULES.debts.name, Icon: CreditCardIcon, tab: 'debts' },
  { section: 'goals', label: MODULES.goals.name, Icon: FlagIcon, tab: 'goals' },
  { section: 'reports', label: MODULES.reports.name, Icon: ChartPieIcon, tab: 'reports' },
]
const TAB_ICON: Partial<Record<Tab, IconCmp>> = {
  home: HomeIcon, activity: ListBulletIcon, insights: ChartBarIcon, refund: ArrowUturnLeftIcon,
  debts: CreditCardIcon, 'debts-schedule': CalendarDaysIcon,
  goals: FlagIcon, 'goals-emergency': ShieldCheckIcon,
  reports: ChartPieIcon, 'reports-yearly': TableCellsIcon, 'reports-export': ArrowDownTrayIcon,
  settings: UserIcon, 'settings-categories': TagIcon, 'settings-recurring': ArrowPathIcon, 'settings-data': CircleStackIcon, 'settings-billing': BanknotesIcon, 'settings-refund': ArrowUturnLeftIcon,
}
const SECTION_TITLE: Record<Section, string> = { dashboard: 'Golden Tool', debts: MODULES.debts.name, goals: MODULES.goals.name, reports: MODULES.reports.name, settings: 'Settings', more: 'More' }

export function GoldMark({ size = 36 }: { size?: number }) {
  return <img src={`${import.meta.env.BASE_URL}${size > 96 ? 'logo-512.png' : 'logo-192.png'}`} width={size} height={size} alt="Golden Tool" className="shrink-0 select-none" draggable={false} />
}

export default function Layout({ children }: { children: ReactNode }) {
  const tab = useUI(s => s.tab)
  const setTab = useUI(s => s.setTab)
  const settings = useStore(s => s.settings)
  const update = useStore(s => s.updateSettings)
  const spent = useStore(s => total(expensesForMonth(s.expenses, currentMonthKey())))
  const email = useAccount(s => s.session?.user.email)
  const [help, setHelp] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const section = sectionOf(tab)
  const items = SECTION_TABS[section]
  const resolvedDark = settings.theme === 'dark' || (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  const isModule = section === 'debts' || section === 'goals' || section === 'reports'
  const sectionLocked = isModule && !hasModule(settings, section)
  const left = daysLeft(settings)
  const readOnly = isReadOnly(settings)
  const lifetime = isLifetime(settings)
  const isSettings = section === 'settings'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) && !t.isContentEditable) { e.preventDefault(); useUI.getState().openSheet() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // A new screen starts at the top; the panel is the scroller, so the browser does not do this for us.
  useLayoutEffect(() => { scroller.current?.scrollTo(0, 0) }, [tab])

  const toggleTheme = () => update({ theme: resolvedDark ? 'light' : 'dark' })
  const pct = settings.monthlyLimit > 0 ? Math.round((spent / settings.monthlyLimit) * 100) : 0
  const money = (n: number) => fmt(n, settings.currency, { maximumFractionDigits: 0 })

  return (
    <div className="h-full flex bg-background">
      {/* Icon rail: 72px + 1px line */}
      <aside className="hidden lg:flex w-[73px] shrink-0 flex-col items-center border-r border-line py-[18px]">
        <button onClick={() => setTab('home')} aria-label="Home" className="rounded-lg"><GoldMark /></button>
        <nav aria-label="Sections" className="mt-[26px] flex flex-col gap-3">
          {RAIL.map(r => (
            <RailButton key={r.section} label={r.label} active={section === r.section} onClick={() => setTab(r.tab)} locked={r.section !== 'dashboard' && !hasModule(settings, r.section as ModuleKind)}><r.Icon /></RailButton>
          ))}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-3">
          <RailButton label={resolvedDark ? 'Light mode' : 'Dark mode'} onClick={toggleTheme}>{resolvedDark ? <SunIcon /> : <MoonIcon />}</RailButton>
          <RailButton label="Resources" onClick={() => setHelp(true)}><QuestionMarkCircleIcon /></RailButton>
          <RailButton label="Settings" active={isSettings} onClick={() => setTab('settings')}><Cog6ToothIcon /></RailButton>
        </div>
      </aside>

      {/* Section bar: 228px, same grey as the rail */}
      <aside className="hidden lg:flex w-[228px] shrink-0 flex-col px-3 pt-[22px] pb-3">
        <div className="h-[22px] px-2 flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{SECTION_TITLE[section]}</span>
          {section === 'dashboard' && lifetime && <Chip tone="lifetime">Lifetime</Chip>}
          {isModule && <Chip tone={sectionLocked ? 'muted' : 'outline'} className={sectionLocked ? 'bg-muted-2/60' : undefined}>{sectionLocked ? 'Locked' : 'Active'}</Chip>}
        </div>
        <nav aria-label={SECTION_TITLE[section]} className="mt-6 flex flex-col gap-1">
          {items.map(({ tab: t, label }) => {
            const Icon = TAB_ICON[t] ?? HomeIcon
            const on = tab === t
            return (
              <button key={t} onClick={() => setTab(t)} aria-current={on ? 'page' : undefined} className={cx('t h-8 px-2 rounded-lg flex items-center gap-2.5 text-sm text-foreground', on ? 'bg-nav-active shadow-[var(--shadow-pill)]' : 'hover:bg-muted-2/60')}>
                <Icon className={cx('h-4 w-4', on ? 'text-foreground' : 'text-muted-foreground')} />
                <span className="flex-1 text-left truncate">{label}</span>
                {sectionLocked && <LockClosedIcon className="h-3 w-3 text-muted-foreground" />}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto">
          {/* Footer card: where the month stands, on every screen. */}
          <button onClick={() => setTab('home')} className="t w-full text-left rounded-xl bg-card shadow-[var(--shadow-pill)] p-3 hover:bg-card/80">
            <div className="flex items-baseline justify-between gap-2"><span className="text-sm text-foreground">This month</span><span className={cx('text-xs', pct > 100 ? 'text-destructive' : 'text-muted-foreground')}>{pct}%</span></div>
            <ProgressBar value={pct} tone={pct > 100 ? 'bad' : pct >= 85 ? 'warn' : undefined} className="mt-2.5" />
            <div className="mt-2.5 text-xs text-muted-foreground truncate">{money(spent)} of {money(settings.monthlyLimit)}</div>
          </button>
          <button onClick={() => setHelp(true)} className="t mt-2 w-full h-8 px-2 rounded-lg flex items-center gap-2.5 text-sm text-foreground hover:bg-muted-2/60">
            <BookOpenIcon className="h-4 w-4 text-muted-foreground" /><span className="flex-1 text-left">Resources</span>
          </button>
        </div>
      </aside>

      {/* Content panel: white, 4px from the window edge on desktop */}
      <main className="flex-1 min-w-0 lg:p-1 lg:pl-0">
        <div ref={scroller} className="h-full bg-card lg:rounded-lg lg:border lg:border-border overflow-y-auto overscroll-contain">
          {/* Top bar: quick search left, account right. */}
          <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button onClick={() => setTab('home')} aria-label="Home" className="lg:hidden shrink-0 inline-flex items-center"><GoldMark size={28} /></button>
              <QuickSearchButton />
            </div>
            <Menu trigger={open => (
              <button aria-label="Account" className={cx('t h-8 pl-1 pr-2 rounded-md flex items-center gap-2 text-sm text-foreground hover:bg-muted', open && 'bg-muted')}>
                <span className="h-6 w-6 rounded-full bg-muted-2 text-foreground inline-flex items-center justify-center text-xs font-medium">{email ? email[0].toUpperCase() : 'G'}</span>
                <span className={cx('hidden sm:inline max-w-[180px] truncate', !hasAccounts && 'text-muted-foreground')}>{hasAccounts ? email ?? 'Your account' : 'Local mode'}</span>
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            )}>
              {close => (<>
                <MenuItem onClick={() => { setTab('settings'); close() }}><Cog6ToothIcon />Settings</MenuItem>
                <MenuItem onClick={() => { setTab('settings-billing'); close() }}><BanknotesIcon />Billing</MenuItem>
                <MenuItem onClick={() => { setTab('settings-refund'); close() }}><ArrowUturnLeftIcon />Refund</MenuItem>
                <MenuItem onClick={() => { toggleTheme(); close() }}>{resolvedDark ? <SunIcon /> : <MoonIcon />}{resolvedDark ? 'Light mode' : 'Dark mode'}</MenuItem>
                <MenuItem onClick={() => { setHelp(true); close() }}><BookOpenIcon />Resources</MenuItem>
                <div className="hr my-1" />
                {hasAccounts && email
                  ? <MenuItem onClick={() => { void useAccount.getState().signOut(); setTab('home'); close() }}><ArrowRightStartOnRectangleIcon />Sign out</MenuItem>
                  : <MenuItem disabled className="opacity-50"><ArrowRightStartOnRectangleIcon />Sign out</MenuItem>}
              </>)}
            </Menu>
          </div>
          {/* Access strip */}
          {!lifetime && left !== null && (readOnly || left <= 30) && (
            <div className={cx('mx-4 sm:mx-6 mb-2 px-3 min-h-10 py-2 rounded-lg flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm', readOnly ? 'bg-destructive-soft text-destructive' : 'bg-warn-soft text-foreground')}>
              <span>{readOnly ? 'Included access ended. Viewing and export still work.' : `Included access ends in ${left} day${left === 1 ? '' : 's'}.`}</span>
              <a href={LIFETIME.checkoutUrl} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 underline underline-offset-2">Get lifetime access<ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" /></a>
            </div>
          )}
          <div className={cx('mx-auto px-4 sm:px-6 pt-2 lg:pt-3 pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-12', isSettings ? 'max-w-[544px] lg:pt-8' : 'max-w-[1280px]')}>
            {children}
          </div>
        </div>
      </main>

      {/* Phone bar (64px): Home, Activity, add, Insights, More. Nothing gold. */}
      <nav aria-label="Main" className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="h-16 grid grid-cols-5 items-center px-2">
          <MobileTab label="Home" Icon={HomeIcon} active={tab === 'home'} onClick={() => setTab('home')} />
          <MobileTab label="Activity" Icon={ListBulletIcon} active={tab === 'activity'} onClick={() => setTab('activity')} />
          <button onClick={() => useUI.getState().openSheet()} aria-label="Add expense" className="t mx-auto h-11 w-11 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center active:scale-95"><PlusIcon className="h-5 w-5" /></button>
          <MobileTab label="Insights" Icon={ChartBarIcon} active={tab === 'insights'} onClick={() => setTab('insights')} />
          <MobileTab label="More" Icon={EllipsisHorizontalIcon} active={section !== 'dashboard' || tab === 'refund'} onClick={() => setTab('more')} />
        </div>
      </nav>

      <Dialog open={help} onClose={() => setHelp(false)} title="Resources" description="Quick ways to get more out of Golden Tool." width={420}>
        <ul className="text-sm text-foreground space-y-4">
          <li><span className="text-muted-foreground">Add fast.</span> Press <kbd className="px-1.5 py-0.5 rounded-sm bg-muted text-xs">N</kbd> anywhere to log an expense.</li>
          <li><span className="text-muted-foreground">Fixed bills.</span> Turn on “Repeat monthly” once and rent, phone and subscriptions add themselves.</li>
          <li><span className="text-muted-foreground">Keep a backup.</span> Settings → Data → Export.</li>
          <li><span className="text-muted-foreground">Add-ons.</span> Manage them in Settings → Billing.</li>
        </ul>
      </Dialog>

      <Toaster />
    </div>
  )
}

/** 32px rail tile, radius 8. A locked add-on carries a small grey lock. */
function RailButton({ label, active, onClick, children, locked }: { label: string; active?: boolean; onClick: () => void; children: ReactNode; locked?: boolean }) {
  return (
    <button aria-label={locked ? `${label}, locked` : label} title={label} onClick={onClick} className={cx('t relative h-8 w-8 rounded-lg inline-flex items-center justify-center [&>svg]:h-4 [&>svg]:w-4', active ? 'bg-rail-active text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-rail-active/50')}>
      {children}
      {locked && <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-background inline-flex items-center justify-center"><LockClosedIcon className="h-2.5 w-2.5 text-muted-foreground" /></span>}
    </button>
  )
}
function MobileTab({ label, Icon, active, onClick }: { label: string; Icon: IconCmp; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined} className={cx('t h-full flex flex-col items-center justify-center gap-1 text-[11px] leading-none', active ? 'text-foreground' : 'text-muted-foreground')}>
      <Icon className="h-5 w-5" />{label}
    </button>
  )
}
