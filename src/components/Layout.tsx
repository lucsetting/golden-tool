import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Squares2X2Icon, Cog6ToothIcon, HomeIcon, ListBulletIcon, ChartBarIcon, MoonIcon, SunIcon, PlusIcon, QuestionMarkCircleIcon, GiftIcon, CreditCardIcon, FlagIcon, ChartPieIcon, EllipsisHorizontalIcon, UserIcon, TagIcon, ArrowPathIcon, CircleStackIcon, CalendarDaysIcon, ShieldCheckIcon, TableCellsIcon, ArrowDownTrayIcon, LockClosedIcon, ArrowTopRightOnSquareIcon, ArrowUturnLeftIcon, BanknotesIcon, ChevronDownIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { SECTION_TABS, sectionOf, useUI, type Section, type Tab } from '../ui-state'
import { expensesForMonth, total } from '../lib/calc'
import { currentMonthKey, fmt } from '../lib/money'
import { LIFETIME, MODULES, type ModuleKind } from '../lib/modules'
import { daysLeft, hasModule, isLifetime, isReadOnly } from '../lib/access'
import { useAccount } from '../account'
import { hasAccounts } from '../lib/supabase'
import { Dialog, Menu, MenuItem, cx } from './ui'
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
  const { tab, setTab, toast } = useUI()
  const settings = useStore(s => s.settings)
  const update = useStore(s => s.updateSettings)
  const spent = useStore(s => total(expensesForMonth(s.expenses, currentMonthKey())))
  const [help, setHelp] = useState(false)
  const section = sectionOf(tab)
  const items = SECTION_TABS[section]
  const resolvedDark = settings.theme === 'dark' || (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  const locked = (Object.keys(MODULES) as ModuleKind[]).filter(m => !hasModule(settings, m))
  const sectionLocked = section === 'debts' || section === 'goals' || section === 'reports' ? !hasModule(settings, section) : false
  const left = daysLeft(settings)
  const readOnly = isReadOnly(settings)
  const lifetime = isLifetime(settings)
  const isSettings = section === 'settings'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) && !t.isContentEditable) { e.preventDefault(); useUI.getState().openSheet() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const email = useAccount(s => s.session?.user.email)
  const toggleTheme = () => update({ theme: resolvedDark ? 'light' : 'dark' })
  const pct = settings.monthlyLimit > 0 ? Math.min(100, Math.round((spent / settings.monthlyLimit) * 100)) : 0

  return (
    <div className="h-full flex bg-background">
      {/* Icon rail: 72px + 1px line (Mochi) */}
      <aside className="hidden lg:flex w-[73px] shrink-0 flex-col items-center border-r border-line pt-[18px] pb-[18px]">
        <GoldMark />
        <nav className="mt-[26px] flex flex-col gap-3">
          {RAIL.map(r => (
            <RailButton key={r.section} label={r.label} active={section === r.section} onClick={() => setTab(r.tab)} dot={r.section !== 'dashboard' && !hasModule(settings, r.section as ModuleKind)}><r.Icon /></RailButton>
          ))}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-3">
          <RailButton label="Settings" active={isSettings} onClick={() => setTab('settings')}><Cog6ToothIcon /></RailButton>
          <button aria-label={resolvedDark ? 'Light mode' : 'Dark mode'} title="Theme" onClick={toggleTheme} className="t h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground [&>svg]:h-4 [&>svg]:w-4">{resolvedDark ? <MoonIcon /> : <SunIcon />}</button>
          <button aria-label="Help" title="Help" onClick={() => setHelp(true)} className="t h-8 w-8 inline-flex items-center justify-center rounded-full text-foreground shadow-[0_0_0_1px_var(--hairline-strong)] hover:bg-muted-2/50 [&>svg]:h-4 [&>svg]:w-4"><QuestionMarkCircleIcon /></button>
          <span className="relative h-9 w-9 rounded-full bg-gold-soft text-gold-ink inline-flex items-center justify-center text-sm font-medium">G<span className="absolute -bottom-px -right-px h-3 w-3 rounded-full bg-success ring-2 ring-background" /></span>
        </div>
      </aside>

      {/* Section bar: 228px */}
      <aside className="hidden lg:flex w-[228px] shrink-0 flex-col px-3 pt-[22px] pb-4">
        <div className="h-[22px] px-1 flex items-center gap-2 min-w-0">
          <span className="text-sm text-foreground truncate">{SECTION_TITLE[section]}</span>
          {section === 'dashboard' && <Pill tone={lifetime ? 'gold' : 'muted'}>{lifetime ? 'Lifetime' : 'Free'}</Pill>}
          {(section === 'debts' || section === 'goals' || section === 'reports') && <Pill tone={sectionLocked ? 'muted' : 'gold'}>{sectionLocked ? 'Locked' : 'Active'}</Pill>}
        </div>
        <nav className="mt-[26px] flex flex-col gap-[9px]">
          {items.map(({ tab: t, label }) => {
            const Icon = TAB_ICON[t] ?? HomeIcon
            return (
              <button key={t} onClick={() => setTab(t)} className={cx('t h-[34px] px-3 rounded-[10px] flex items-center gap-2.5 text-sm', tab === t ? 'bg-nav-active text-foreground' : 'text-foreground hover:bg-nav-active/50')}>
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-left">{label}</span>
                {sectionLocked && <LockClosedIcon className="h-3 w-3 text-muted-foreground" />}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto">
          {/* Footer card (Mochi "Welcome from the founder" slot): month status. */}
          <div className="rounded-xl bg-card overflow-hidden">
            <div className="px-3 h-10 flex items-center text-sm text-foreground">This month</div>
            <div className="px-3 pb-3">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} /></div>
              <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground"><span>{fmt(spent, settings.currency, { maximumFractionDigits: 0 })} spent</span><span>{pct}% of {fmt(settings.monthlyLimit, settings.currency, { maximumFractionDigits: 0 })}</span></div>
            </div>
          </div>
          <button onClick={() => setHelp(true)} className="t mt-2 w-full h-9 px-2 rounded-lg flex items-center gap-2 text-sm text-foreground hover:bg-nav-active/50">
            <QuestionMarkCircleIcon className="h-4 w-4 text-muted-foreground" /><span className="flex-1 text-left">Resources</span><GiftIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </aside>

      {/* Content panel */}
      <main className="flex-1 min-w-0 lg:p-1 lg:pl-0">
        <div className="h-full bg-card lg:rounded-lg lg:border lg:border-border overflow-y-auto">
          {/* Top bar (Nevian): quick search left, account right. */}
          <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button onClick={() => setTab('home')} className="lg:hidden shrink-0 inline-flex items-center"><GoldMark size={24} /></button>
              <QuickSearchButton />
            </div>
            <Menu trigger={open => (
              <button className={cx('t h-8 pl-1 pr-2 rounded-md flex items-center gap-2 text-sm text-foreground hover:bg-muted', open && 'bg-muted')}>
                <span className="h-6 w-6 rounded-full bg-gold-soft text-gold-ink inline-flex items-center justify-center text-xs font-medium">{email ? email[0].toUpperCase() : 'G'}</span>
                <span className={cx('hidden sm:inline max-w-[180px] truncate', !hasAccounts && 'text-muted-foreground')}>{hasAccounts ? email ?? 'Your account' : 'Local mode'}</span>
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            )}>
              {close => (<>
                <MenuItem onClick={() => { setTab('settings'); close() }}><Cog6ToothIcon />Settings</MenuItem>
                <MenuItem onClick={() => { setTab('settings-billing'); close() }}><BanknotesIcon />Billing</MenuItem>
                <MenuItem onClick={() => { setTab('settings-refund'); close() }}><ArrowUturnLeftIcon />Refund</MenuItem>
                <MenuItem onClick={() => { toggleTheme(); close() }}>{resolvedDark ? <SunIcon /> : <MoonIcon />}{resolvedDark ? 'Light mode' : 'Dark mode'}</MenuItem>
                <div className="hr my-1" />
                {hasAccounts && email
                  ? <MenuItem onClick={() => { void useAccount.getState().signOut(); setTab('home'); close() }}><ArrowRightStartOnRectangleIcon />Sign out</MenuItem>
                  : <MenuItem disabled className="opacity-50"><ArrowRightStartOnRectangleIcon />Sign out</MenuItem>}
              </>)}
            </Menu>
          </div>
          {/* Access strip */}
          {!lifetime && left !== null && (readOnly || left <= 30) && (
            <div className={cx('px-4 sm:px-6 h-10 flex items-center justify-between gap-3 text-sm border-b border-border', readOnly ? 'bg-destructive-soft text-destructive' : 'bg-gold-soft text-gold-ink')}>
              <span className="truncate">{readOnly ? 'Included access ended. Viewing and export still work.' : `Included access ends in ${left} day${left === 1 ? '' : 's'}.`}</span>
              <a href={LIFETIME.checkoutUrl} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 underline-offset-2 hover:underline">Get lifetime access<ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" /></a>
            </div>
          )}
          <div className={cx('mx-auto px-4 sm:px-6 pt-4 pb-28 lg:pb-12', isSettings ? 'max-w-[496px] lg:pt-8' : 'max-w-[1100px]')}>
            {items.length > 1 && section !== 'dashboard' && (
              <div className="lg:hidden flex gap-1 overflow-x-auto -mx-4 px-4 mb-6">
                {items.map(({ tab: t, label }) => (
                  <button key={t} onClick={() => setTab(t)} className={cx('t h-8 px-3 rounded-md text-sm whitespace-nowrap', tab === t ? 'bg-muted text-foreground' : 'text-muted-foreground')}>{label}</button>
                ))}
              </div>
            )}
            <PageEnter key={tab}>{children}</PageEnter>
          </div>
        </div>
      </main>

      {/* Mobile bar (64px): Home, Activity, +, Insights, More */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="h-16 grid grid-cols-5 items-center px-2">
          <MobileTab label="Home" Icon={HomeIcon} active={tab === 'home'} onClick={() => setTab('home')} />
          <MobileTab label="Activity" Icon={ListBulletIcon} active={tab === 'activity'} onClick={() => setTab('activity')} />
          <button onClick={() => useUI.getState().openSheet()} aria-label="Add expense" className="mx-auto h-10 w-10 rounded-xl gold-surface text-on-gold inline-flex items-center justify-center"><PlusIcon className="h-5 w-5" /></button>
          <MobileTab label="Insights" Icon={ChartBarIcon} active={tab === 'insights'} onClick={() => setTab('insights')} />
          <MobileTab label="More" Icon={EllipsisHorizontalIcon} active={section !== 'dashboard'} onClick={() => setTab('more')} dot={locked.length > 0} />
        </div>
      </nav>

      <Dialog open={help} onClose={() => setHelp(false)} title="Resources" description="Quick ways to get more out of Golden Tool." width={420}>
        <ul className="text-sm text-foreground space-y-4">
          <li><span className="text-muted-foreground">Add fast.</span> Press <kbd className="px-1.5 py-0.5 rounded-sm bg-muted text-xs">N</kbd> anywhere to log an expense.</li>
          <li><span className="text-muted-foreground">Fixed bills.</span> Turn on “Repeat monthly” once and rent, phone and subscriptions add themselves.</li>
          <li><span className="text-muted-foreground">Keep a backup.</span> Settings → Data → Export. Your data lives only in this browser.</li>
          <li><span className="text-muted-foreground">Add-ons.</span> Manage them in Settings → Billing.</li>
        </ul>
      </Dialog>

      {toast && (
        <div className={cx('fixed top-4 left-1/2 -translate-x-1/2 z-[60] h-9 px-3 rounded-md text-sm inline-flex items-center shadow-[var(--shadow-popover)] animate-[dialogIn_.15s_var(--ease-standard)]', toast.kind === 'err' ? 'bg-destructive text-white' : 'bg-card text-foreground')}>{toast.msg}</div>
      )}
    </div>
  )
}

/** Remounts per tab (key) so the page fades up; cards and trays inside get a 35ms stagger. */
function PageEnter({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>('.ui-card, [data-anim]') ?? []
    els.forEach((el, i) => { el.style.animationDelay = `${Math.min(i, 10) * 35 + 40}ms` })
  }, [])
  return <div ref={ref} className="page-enter">{children}</div>
}

function Pill({ tone, children }: { tone: 'gold' | 'muted'; children: ReactNode }) {
  return <span className={cx('inline-flex items-center h-[18px] px-2 rounded-full text-xs shrink-0', tone === 'gold' ? 'text-gold-ink shadow-[inset_0_0_0_1px_var(--gold)]' : 'text-muted-foreground shadow-[inset_0_0_0_1px_var(--hairline-strong)]')}>{children}</span>
}
/** 32px rail tile (Mochi: radius 8, active #3b3b3b / #dedede). `dot` = locked add-on marker. */
function RailButton({ label, active, onClick, children, dot }: { label: string; active?: boolean; onClick: () => void; children: ReactNode; dot?: boolean }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className={cx('t relative h-8 w-8 rounded-lg inline-flex items-center justify-center [&>svg]:h-4 [&>svg]:w-4', active ? 'bg-rail-active text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-rail-active/50')}>
      {children}
      {dot && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-gold ring-2 ring-background" />}
    </button>
  )
}
function MobileTab({ label, Icon, active, onClick, dot }: { label: string; Icon: IconCmp; active: boolean; onClick: () => void; dot?: boolean }) {
  return (
    <button onClick={onClick} className={cx('t relative h-full flex flex-col items-center justify-center gap-1 text-[10px]', active ? 'text-foreground' : 'text-muted-foreground')}>
      <Icon className={cx('h-5 w-5', active && 'text-gold')} />{label}
      {dot && <span className="absolute top-3 right-[calc(50%-14px)] h-1.5 w-1.5 rounded-full bg-gold ring-2 ring-card" />}
    </button>
  )
}
