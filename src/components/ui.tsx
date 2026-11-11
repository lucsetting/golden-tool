import * as React from 'react'
import { ChevronDownIcon, ChartPieIcon, ClockIcon, ArrowPathIcon, CalendarDaysIcon, TagIcon, BuildingStorefrontIcon, ChartBarIcon, CreditCardIcon, FlagIcon, ShieldCheckIcon, DocumentTextIcon, ArrowDownTrayIcon, ArrowUturnLeftIcon, KeyIcon, BanknotesIcon, Squares2X2Icon } from '@heroicons/react/16/solid'
import {
  ShoppingCart, Utensils, Car, Home, Zap, HeartPulse, ShoppingBag, Clapperboard, Repeat, Sparkles, GraduationCap, Circle,
  Coffee, Plane, Gift, Dumbbell, Gamepad2, Baby, PawPrint, Smartphone, Wrench, Shirt, Music, Briefcase,
  BarChart3, CreditCard, PieChart, Receipt, SearchX, Target, TrendingUp, Wallet, Inbox,
} from 'lucide-react'
import type { Category } from '../types'
import { SECTION_TABS, sectionOf, useUI } from '../ui-state'

export function cx(...a: Array<string | false | null | undefined>) { return a.filter(Boolean).join(' ') }

// Explicit icon map keeps lucide tree-shakeable. Add a name here AND to Settings ICONS to offer it.
const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
  ShoppingCart, Utensils, Car, Home, Zap, HeartPulse, ShoppingBag, Clapperboard, Repeat, Sparkles, GraduationCap, Circle,
  Coffee, Plane, Gift, Dumbbell, Gamepad2, Baby, PawPrint, Smartphone, Wrench, Shirt, Music, Briefcase,
  BarChart3, CreditCard, PieChart, Receipt, SearchX, Target, TrendingUp, Wallet, Inbox,
}
export function CategoryIcon({ icon, className, size = 16 }: { icon: string; className?: string; size?: number }) {
  const Cmp = ICONS[icon] ?? Circle
  return <Cmp size={size} className={className} strokeWidth={2.25} />
}

/** Mochi funnel-stage tile: coloured rounded square, white glyph. 16 = inline, 24 = row tile, 32 = avatar-sized. */
export function CategoryBadge({ category, size = 24, className }: { category: Pick<Category, 'icon' | 'color'>; size?: number; className?: string }) {
  const r = size <= 16 ? 4 : size <= 24 ? 6 : 8
  return (
    <span className={cx('inline-flex items-center justify-center shrink-0 text-white', className)} style={{ width: size, height: size, borderRadius: r, background: category.color }}>
      <CategoryIcon icon={category.icon} size={Math.round(size * 0.58)} />
    </span>
  )
}

/* ---------- Surfaces ---------- */

/** Card: white, hairline border, radius 12. */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-xl bg-card border border-border overflow-hidden', className)} {...rest}>{children}</div>
}
const HEADER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Where it went': ChartPieIcon, Recent: ClockIcon, Bills: ArrowPathIcon, 'Month by month': CalendarDaysIcon, 'Last 6 months': ChartBarIcon,
  'By category': TagIcon, 'Top merchants': BuildingStorefrontIcon, 'By weekday': CalendarDaysIcon, Debts: CreditCardIcon,
  'Your target': ShieldCheckIcon, 'Which categories count': TagIcon, 'Category budgets': ChartPieIcon, Monthly: ChartBarIcon, 'By category this year': TagIcon,
  CSV: ArrowDownTrayIcon, 'Monthly summary': DocumentTextIcon, Policy: ShieldCheckIcon, 'Request a refund': ArrowUturnLeftIcon, 'Activation codes': KeyIcon,
  'Add-ons': Squares2X2Icon, Goals: FlagIcon, Billing: BanknotesIcon, 'Last 7 days': CalendarDaysIcon, 'Bills due soon': ClockIcon, Budgets: ChartPieIcon,
}
/** 44px card header with hairline below. A muted 16px icon sits before the title (explicit `icon`, or looked up by title). */
export function CardHeader({ title, right, className, icon }: { title: React.ReactNode; right?: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  const Auto = typeof title === 'string' ? HEADER_ICONS[title] : undefined
  return (
    <div className={cx('h-11 max-sm:has-[.ctl]:h-14 max-sm:has-[.ctl-sm]:h-14 pl-4 pr-2 flex items-center justify-between gap-3 border-b border-border', className)}>
      <div className="flex items-center gap-2 min-w-0">
        {icon ?? (Auto ? <Auto className="h-4 w-4 text-muted-foreground shrink-0" /> : null)}
        <h3 className="text-sm text-foreground truncate">{title}</h3>
      </div>
      {right && <div className="flex items-center gap-2 shrink-0 pr-2">{right}</div>}
    </div>
  )
}
/** A number that counts from its previous value to the new one in 300ms. No motion on first paint or under reduced motion. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = React.useState(value)
  const from = React.useRef(value)
  React.useEffect(() => {
    const start = from.current
    from.current = value
    if (start === value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return }
    let raf = 0
    const t0 = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 300)
      setShown(start + (value - start) * (1 - (1 - k) ** 3))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{format(shown)}</>
}

/** Metric tray: grey frame, 4px padding, white cards inside.
 *  `cols={4}` is 2x2 on a phone; `cols={3}` (and 2) collapses to compact label/value rows on a phone. */
export function MetricTray({ children, cols = 3, className }: { children: React.ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  const grid = cols === 4 ? 'grid-cols-2 lg:grid-cols-4' : cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
  return <div data-rows={cols === 4 ? undefined : ''} className={cx('group/tray rounded-xl bg-muted border border-border p-1 grid gap-1', grid, className)}>{children}</div>
}
export function Metric({ label, value, sub, icon, tone, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; tone?: 'good' | 'warn' | 'bad'; className?: string }) {
  const toneCls = tone === 'good' ? 'text-success' : tone === 'warn' ? 'text-warn' : tone === 'bad' ? 'text-destructive' : 'text-foreground'
  return (
    <div className={cx(
      'rounded-lg bg-card border border-border p-4 sm:p-5 min-h-[104px] sm:min-h-[116px] flex flex-col justify-between gap-4',
      'max-sm:group-data-[rows]/tray:min-h-0 max-sm:group-data-[rows]/tray:flex-row max-sm:group-data-[rows]/tray:items-center',
      className,
    )}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-end justify-between gap-3 max-sm:group-data-[rows]/tray:text-right">
        <div className="min-w-0">
          <div className={cx('text-xl sm:text-2xl tabular-nums tracking-tight max-sm:group-data-[rows]/tray:text-base', toneCls)}>{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1 max-sm:group-data-[rows]/tray:mt-0">{sub}</div>}
        </div>
        {icon && <span className="h-6 w-6 rounded-md bg-muted text-muted-foreground inline-flex items-center justify-center shrink-0 max-sm:group-data-[rows]/tray:hidden [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
      </div>
    </div>
  )
}
/** Phone only: the screens of the current section as a segmented strip. Desktop has the section bar for this. */
export function SectionStrip({ className }: { className?: string }) {
  const tab = useUI(s => s.tab)
  const setTab = useUI(s => s.setTab)
  const section = sectionOf(tab)
  const items = SECTION_TABS[section]
  // The main section's screens are on the phone bar and under More.
  if (items.length < 2 || section === 'dashboard') return null
  return (
    <div className={cx('lg:hidden -mx-4 px-4 overflow-x-auto no-scrollbar', className)}>
      <div role="tablist" className="inline-flex min-w-full ctl p-0.5 rounded-md bg-muted">
        {items.map(i => (
          <button key={i.tab} type="button" role="tab" aria-selected={tab === i.tab} onClick={() => setTab(i.tab)}
            className={cx('t flex-1 h-full px-3 rounded-[6px] text-sm whitespace-nowrap', tab === i.tab ? 'bg-card text-foreground shadow-[var(--shadow-pill)]' : 'text-muted-foreground')}>
            {i.label}
          </button>
        ))}
      </div>
    </div>
  )
}
/** Page header: 18px title, muted subtitle under it, actions on the right (their own row on a phone).
 *  On a phone the section's screens follow as a segmented strip. */
export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mb-5 sm:mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <SectionStrip className="mt-4" />
    </header>
  )
}
export function Divider({ className }: { className?: string }) { return <div className={cx('hr my-8', className)} /> }

/* ---------- Table ---------- */
/** Column header row of a list inside a Card: 36px, grey band, 12px muted labels. Give each child the same width class as its row cell. */
export function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('h-9 px-4 flex items-center gap-3 text-xs text-muted-foreground bg-muted/60 border-b border-border', className)}>{children}</div>
}
/** A list row: 56px minimum, hairline between rows. Becomes a button (hover, focus ring) when `onClick` is given. */
export function TableRow({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  const cls = cx('w-full min-h-14 px-4 py-2.5 flex items-center gap-3 text-left text-sm border-b border-border last:border-b-0', className)
  return onClick
    ? <button type="button" onClick={onClick} className={cx('t hover:bg-muted/50 focus-visible:outline-offset-[-2px]', cls)}>{children}</button>
    : <div className={cls}>{children}</div>
}

/* ---------- Controls ---------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' | 'destructive' | 'soft'; size?: 'sm' | 'md'; open?: boolean }
/** Button: 36px (sm 32), radius 8, 14/450, gap 4. Primary is near-black; outline is white with a hairline ring and soft shadow. */
export function Button({ variant = 'outline', size = 'md', open, className, children, ...rest }: BtnProps) {
  const v = {
    outline: cx('bg-card text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] [&>svg]:text-muted-foreground', open ? 'shadow-[var(--shadow-button-open)] [&>svg:first-child]:text-foreground' : 'shadow-[var(--shadow-button)]'),
    primary: 'bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,.12)] hover:bg-[color-mix(in_oklab,var(--primary)_88%,var(--card))] active:bg-[color-mix(in_oklab,var(--primary)_80%,var(--card))]',
    soft: 'bg-muted text-foreground hover:bg-muted-2 [&>svg]:text-muted-foreground',
    ghost: 'bg-transparent text-foreground hover:bg-muted [&>svg]:text-muted-foreground',
    destructive: 'bg-card text-destructive shadow-[var(--shadow-button)] hover:bg-destructive-soft [&>svg]:text-destructive',
  }[variant]
  const s = size === 'sm' ? 'ctl-sm px-2' : 'ctl px-3'
  return (
    <button className={cx('t inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium whitespace-nowrap select-none disabled:opacity-40 disabled:pointer-events-none [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>span]:px-0.5', v, s, className)} {...rest}>
      {typeof children === 'string' ? <span>{children}</span> : children}
    </button>
  )
}
/** Icon-only 36px button (sm 32). */
export function IconButton({ label, className, size = 'md', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' | 'md' }) {
  return <button aria-label={label} title={label} className={cx('t inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted [&>svg]:h-4 [&>svg]:w-4', size === 'sm' ? 'ctl-sm ctl-sq' : 'ctl ctl-sq', className)} {...rest} />
}

/** Field look shared by Input and Select. 16px text on phones stops iOS from zooming the page on focus. */
export const inputCls = 't w-full ctl px-3 rounded-md bg-input text-base sm:text-sm text-foreground placeholder:text-muted-foreground shadow-[var(--shadow-button)] outline-none focus:shadow-[var(--shadow-focus)] disabled:opacity-50'
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />
}
export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...props} className={cx(inputCls, 'appearance-none pr-8', className)}>{children}</select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </span>
  )
}
/** Form field: label, control, then hint or error. */
export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-sm text-foreground mb-2">{label}</span>
      {children}
      {error ? <span className="block text-xs text-destructive mt-1.5">{error}</span> : hint ? <span className="block text-xs text-muted-foreground mt-1.5">{hint}</span> : null}
    </label>
  )
}
/** Settings row: label and description left, control right (240). Stacks on a phone. */
export function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {description && <div className="text-sm text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className="w-full sm:w-60 shrink-0">{children}</div>
    </div>
  )
}

/** Segmented control: grey track, white active tab with soft shadow. `block` stretches it to the row and shares the width equally. */
export function Segmented<T extends string>({ value, options, onChange, className, block }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void; className?: string; block?: boolean }) {
  return (
    <div role="radiogroup" className={cx('items-center ctl p-0.5 rounded-md bg-muted', block ? 'flex w-full' : 'inline-flex', className)}>
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cx('t h-full px-3 rounded-[6px] text-sm whitespace-nowrap', block && 'flex-1 min-w-0 truncate', value === o.value ? 'bg-card text-foreground shadow-[var(--shadow-pill)]' : 'text-muted-foreground hover:text-foreground')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
/** Chip: 12px label, radius 6. `outline` is the neutral bordered state badge. */
export function Chip({ children, tone = 'muted', className }: { children: React.ReactNode; tone?: 'muted' | 'outline' | 'good' | 'bad' | 'warn'; className?: string }) {
  const t = {
    muted: 'bg-muted text-muted-foreground',
    outline: 'text-foreground shadow-[inset_0_0_0_1px_var(--border)]',
    good: 'bg-success-soft text-success',
    bad: 'bg-destructive-soft text-destructive',
    warn: 'bg-warn-soft text-warn',
  }[tone]
  return <span className={cx('inline-flex items-center h-5 px-1.5 rounded-sm text-xs font-medium whitespace-nowrap', t, className)}>{children}</span>
}
/** Switch, 32x20. On is near-black. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cx('t relative h-5 w-8 rounded-full shrink-0 before:absolute before:-inset-3', checked ? 'bg-primary' : 'bg-muted-2')}>
      <span className={cx('t absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-[0_1px_2px_rgba(0,0,0,.25)]', checked ? 'left-[14px]' : 'left-0.5')} />
    </button>
  )
}
/** Progress bar: grey track, near-black fill. `tone` colours it only to warn (close to or over a limit); `color` is for category bars. */
export function ProgressBar({ value, tone, color, className }: { value: number; tone?: 'warn' | 'bad' | 'good'; color?: string; className?: string }) {
  const fill = tone === 'bad' ? 'bg-destructive' : tone === 'warn' ? 'bg-warn' : tone === 'good' ? 'bg-success' : 'bg-primary'
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className={cx('h-1.5 rounded-full bg-muted-2/70 overflow-hidden', className)}>
      <div className={cx('t h-full rounded-full', !color && fill)} style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

/* ---------- Menu (anchored popover; a bottom sheet below 640px) ---------- */
export function Menu({ trigger, children, align = 'end', className }: { trigger: (open: boolean) => React.ReactNode; children: (close: () => void) => React.ReactNode; align?: 'start' | 'end'; className?: string }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown); window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={ref} className={cx('relative inline-block', className)}>
      <div onClick={() => setOpen(o => !o)}>{trigger(open)}</div>
      {open && <div className="sm:hidden fixed inset-0 z-50 bg-black/40 animate-[fadeIn_.15s]" onClick={() => setOpen(false)} />}
      {open && (
        <div role="menu" className={cx(
          'z-50 overflow-y-auto overscroll-contain bg-card shadow-[var(--shadow-popover)]',
          'max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[70dvh] max-sm:rounded-t-2xl max-sm:p-2 max-sm:pb-[calc(8px+env(safe-area-inset-bottom))] max-sm:animate-[sheetUp_.15s_var(--ease-standard)]',
          'sm:absolute sm:mt-1.5 sm:min-w-[180px] sm:max-h-[60vh] sm:rounded-xl sm:p-1 sm:animate-[dialogIn_.15s_var(--ease-standard)]',
          align === 'end' ? 'sm:right-0 sm:origin-top-right' : 'sm:left-0 sm:origin-top-left')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
export function MenuItem({ selected, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button type="button" role="menuitem" className={cx('t w-full text-left ctl-sm px-2 rounded-md text-sm flex items-center gap-2 whitespace-nowrap hover:bg-muted [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground', selected ? 'bg-muted text-foreground' : 'text-foreground', className)} {...rest}>{children}</button>
  )
}

/* ---------- Dialog ---------- */
/** Centered dialog (radius 16, 150ms scale-in); a bottom sheet with a grab handle below 640px.
 *  `keepMounted` keeps the children in the page while closed, so a form opens instantly and keeps its state. */
export function Dialog({ open, onClose, title, description, children, width = 480, keepMounted }: { open: boolean; onClose: () => void; title?: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; width?: number; keepMounted?: boolean }) {
  const root = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  const close = React.useRef(onClose)
  React.useEffect(() => { close.current = onClose })
  // What had focus when the dialog opened, read before an autofocused field inside takes it.
  const opener = React.useRef<HTMLElement | null>(null)
  if (!open) opener.current = null
  else if (!opener.current) opener.current = document.activeElement as HTMLElement | null
  React.useEffect(() => {
    if (!open) return
    const el = root.current, back = opener.current
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close.current()
      if (e.key !== 'Tab' || !el) return
      // Tab stays inside the dialog.
      const stops = [...el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.hasAttribute('disabled') && x.offsetParent)
      const first = stops[0], last = stops[stops.length - 1], at = document.activeElement
      if (!first) return
      if (!el.contains(at) || (!e.shiftKey && at === last)) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && at === first) { e.preventDefault(); last.focus() }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // The phone keyboard shrinks the visual viewport, not the layout one: pin the overlay to what is visible.
    const vv = window.visualViewport
    const fit = () => { if (vv && el) { el.style.top = `${vv.offsetTop}px`; el.style.height = `${vv.height}px` } }
    fit(); vv?.addEventListener('resize', fit); vv?.addEventListener('scroll', fit)
    return () => {
      window.removeEventListener('keydown', onKey); document.body.style.overflow = ''
      vv?.removeEventListener('resize', fit); vv?.removeEventListener('scroll', fit)
      if (back?.isConnected) back.focus({ preventScroll: true })
    }
  }, [open])
  if (!open && !keepMounted) return null
  return (
    <div ref={root} hidden={!open} className="fixed inset-x-0 top-0 h-dvh z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
      <div className="absolute inset-0 bg-black/40 animate-[fadeIn_.15s]" onClick={onClose} />
      <div className="relative w-full max-h-[92%] sm:max-h-full overflow-y-auto overscroll-contain bg-card rounded-t-2xl sm:rounded-2xl shadow-[var(--shadow-dialog)] pb-[env(safe-area-inset-bottom)] animate-[sheetUp_.15s_var(--ease-standard)] sm:animate-[dialogIn_.15s_var(--ease-standard)]" style={{ maxWidth: width }}>
        <div className="sm:hidden mx-auto mt-2 h-1 w-9 rounded-full bg-muted-2" aria-hidden />
        {(title || description) && (
          <div className="px-5 sm:px-6 pt-4 sm:pt-6">
            {title && <h2 id={titleId} className="text-lg text-foreground">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        )}
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

/** Action row that sticks to the bottom of a long dialog, so Save stays in reach above a phone keyboard. */
export const dialogFooterCls = 'sticky bottom-0 -mx-5 -mb-[calc(20px+env(safe-area-inset-bottom))] flex items-center justify-end gap-2 border-t border-border bg-card px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-4'

/* ---------- Toast ---------- */
/** The one toast of the app, fed by `useUI().showToast`. Sits above the phone bottom bar. An action (Undo) keeps it up longer. */
export function Toaster() {
  const toast = useUI(s => s.toast)
  const dismiss = useUI(s => s.dismissToast)
  if (!toast) return null
  return (
    <div role="status" aria-live="polite" className={cx(
      'fixed z-[60] left-1/2 bottom-[calc(76px+env(safe-area-inset-bottom))] lg:bottom-6 max-w-[calc(100vw-32px)] min-h-10 pl-3.5 pr-1.5 py-1.5 rounded-lg text-sm flex items-center gap-2 shadow-[0_8px_24px_rgba(0,0,0,.18)] animate-[toastIn_.15s_var(--ease-standard)_both]',
      toast.kind === 'err' ? 'bg-destructive text-primary-foreground' : 'bg-primary text-primary-foreground',
    )}>
      <span className="truncate pr-2">{toast.msg}</span>
      {toast.action && (
        <button type="button" onClick={() => { toast.action!.run(); dismiss() }} className="t relative before:absolute before:-inset-2 h-7 px-2.5 rounded-md text-sm font-semibold bg-[color-mix(in_oklab,var(--primary-foreground)_16%,transparent)] hover:bg-[color-mix(in_oklab,var(--primary-foreground)_26%,transparent)]">
          {toast.action.label}
        </button>
      )}
    </div>
  )
}

/* ---------- Misc ---------- */
export function ProgressRing({ value, size = 160, stroke = 10, color = 'var(--primary)', track, children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? 'var(--muted)'} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} style={{ transition: 'stroke-dashoffset .3s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
/** Empty state: small grey sketch, one line of what is missing, one action. */
export function Empty({ title = "It's empty here", text, action, className }: { icon?: string; title?: string; text?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center text-center py-12 px-6', className)}>
      <div className="h-[50px] w-[84px] rounded-lg bg-muted mb-6 relative overflow-hidden" aria-hidden>
        <div className="absolute left-3 top-3 h-1.5 w-10 rounded-full bg-muted-2" />
        <div className="absolute left-3 top-6 h-1.5 w-16 rounded-full bg-muted-2" />
        <div className="absolute left-3 top-9 h-1.5 w-6 rounded-full bg-muted-2" />
      </div>
      <div className="text-sm text-foreground">{title}</div>
      {text && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
