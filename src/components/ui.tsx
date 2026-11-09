import * as React from 'react'
import { ChevronDownIcon, ChartPieIcon, ClockIcon, ListBulletIcon, ArrowPathIcon, CalendarDaysIcon, TagIcon, BuildingStorefrontIcon, ChartBarIcon, CreditCardIcon, FlagIcon, ShieldCheckIcon, DocumentTextIcon, ArrowDownTrayIcon, ArrowUturnLeftIcon, KeyIcon, BanknotesIcon, Squares2X2Icon } from '@heroicons/react/16/solid'
import {
  ShoppingCart, Utensils, Car, Home, Zap, HeartPulse, ShoppingBag, Clapperboard, Repeat, Sparkles, GraduationCap, Circle,
  Coffee, Plane, Gift, Dumbbell, Gamepad2, Baby, PawPrint, Smartphone, Wrench, Shirt, Music, Briefcase,
  BarChart3, CreditCard, PieChart, Receipt, SearchX, Target, TrendingUp, Wallet, Inbox,
} from 'lucide-react'
import type { Category } from '../types'

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

/** Card: bg card, hairline border, radius 12. Mochi inner card. */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('ui-card rounded-xl bg-card border border-border overflow-hidden', className)} {...rest}>{children}</div>
}
const HEADER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Where it went': ChartPieIcon, Recent: ClockIcon, Transactions: ListBulletIcon, Recurring: ArrowPathIcon, 'Last 6 months': ChartBarIcon,
  'By category': TagIcon, 'Top merchants': BuildingStorefrontIcon, 'By weekday': CalendarDaysIcon, Debts: CreditCardIcon, 'Payment schedule': CalendarDaysIcon,
  'Your target': ShieldCheckIcon, 'Which categories count': TagIcon, 'Category budgets': ChartPieIcon, Monthly: ChartBarIcon, 'By category this year': TagIcon,
  CSV: ArrowDownTrayIcon, 'Monthly summary': DocumentTextIcon, Policy: ShieldCheckIcon, 'Request a refund': ArrowUturnLeftIcon, 'Activation codes': KeyIcon,
  'Add-ons': Squares2X2Icon, Goals: FlagIcon, Billing: BanknotesIcon,
}
/** 44px card header with hairline below. A muted 16px icon sits before the title (explicit `icon`, or looked up by title). */
export function CardHeader({ title, right, className, icon }: { title: React.ReactNode; right?: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  const Auto = typeof title === 'string' ? HEADER_ICONS[title] : undefined
  return (
    <div className={cx('h-11 px-4 flex items-center justify-between border-b border-border', className)}>
      <div className="flex items-center gap-2 min-w-0">
        {icon ?? (Auto ? <Auto className="h-4 w-4 text-muted-foreground shrink-0" /> : null)}
        <div className="text-sm text-foreground truncate">{title}</div>
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  )
}
/** Metric tray: muted frame, 4px padding, inner cards. Mochi dashboard top row. */
export function MetricTray({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div data-anim className={cx('rounded-xl bg-muted border border-border p-1 grid gap-1', className)}>{children}</div>
}
export function Metric({ label, value, sub, icon, tone, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; tone?: 'good' | 'warn' | 'bad'; className?: string }) {
  const toneCls = tone === 'good' ? 'text-success' : tone === 'warn' ? 'text-warn' : tone === 'bad' ? 'text-destructive' : ''
  return (
    <div className={cx('rounded-lg bg-card border border-border p-5 min-h-[116px] flex flex-col justify-between', className)}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-end justify-between gap-3 mt-6">
        <div>
          <div className={cx('text-2xl text-foreground tabular-nums', toneCls)}>{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-2">{sub}</div>}
        </div>
        {icon && <span className="h-6 w-6 rounded-md bg-muted text-muted-foreground inline-flex items-center justify-center shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
      </div>
    </div>
  )
}
/** Page header: 18px title, 14px muted subtitle, actions right. Dashboard pages. */
export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="min-w-0">
        <h1 className="text-lg text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-2 leading-5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
export function Divider({ className }: { className?: string }) { return <div className={cx('hr my-8', className)} /> }

/* ---------- Controls ---------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' | 'destructive' | 'soft'; size?: 'sm' | 'md'; open?: boolean }
/** Mochi button: 36px (sm 32), radius 8, 14/450, gap 4; text gets 2px side padding when next to an icon. */
export function Button({ variant = 'outline', size = 'md', open, className, children, ...rest }: BtnProps) {
  const v = {
    outline: cx('bg-card text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_4%,var(--card))] [&>svg]:text-muted-foreground', open ? 'shadow-[var(--shadow-button-open)] [&>svg:first-child]:text-foreground' : 'shadow-[var(--shadow-button)]'),
    primary: 'gold-surface text-on-gold hover:brightness-[1.04] [&>svg]:text-on-gold/80',
    soft: 'bg-muted text-foreground hover:bg-muted-2 [&>svg]:text-muted-foreground',
    ghost: 'bg-transparent text-foreground hover:bg-muted [&>svg]:text-muted-foreground',
    destructive: 'bg-card text-destructive shadow-[var(--shadow-button)] hover:bg-destructive-soft [&>svg]:text-destructive',
  }[variant]
  const s = size === 'sm' ? 'h-8 px-2' : 'h-9 px-3'
  return (
    <button className={cx('t inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium select-none disabled:opacity-40 disabled:pointer-events-none [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>span]:px-0.5', v, s, className)} {...rest}>
      {typeof children === 'string' ? <span>{children}</span> : children}
    </button>
  )
}
/** Icon-only 36px button (sm 32). */
export function IconButton({ label, className, size = 'md', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' | 'md' }) {
  return <button aria-label={label} title={label} className={cx('t inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted [&>svg]:h-4 [&>svg]:w-4', size === 'sm' ? 'h-8 w-8' : 'h-9 w-9', className)} {...rest} />
}

export const inputCls = 't w-full h-9 px-3 rounded-md bg-input text-sm text-foreground placeholder:text-muted-foreground shadow-[var(--shadow-button)] outline-none focus:shadow-[var(--shadow-button-applied)]'
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
/** Form field: 14/450 label, 12px gap. */
export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-sm text-foreground mb-3">{label}</span>
      {children}
      {error ? <span className="block text-xs text-destructive mt-2">{error}</span> : hint ? <span className="block text-xs text-muted-foreground mt-2">{hint}</span> : null}
    </label>
  )
}
/** Settings row: label left (240), control right. Mochi settings. */
export function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-base text-foreground">{label}</div>
        {description && <div className="text-sm text-muted-foreground mt-2 leading-5">{description}</div>}
      </div>
      <div className="w-60 shrink-0">{children}</div>
    </div>
  )
}

/** Segmented control: muted track, card-coloured active tab with button shadow. Mochi "Any | Matched | Unmatched". */
export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="radiogroup" className={cx('inline-flex items-center h-9 p-0.5 rounded-md bg-muted', className)}>
      {options.map(o => (
        <button key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cx('t h-8 px-3 rounded-[6px] text-sm whitespace-nowrap', value === o.value ? 'bg-card text-foreground shadow-[var(--shadow-button)]' : 'text-muted-foreground hover:text-foreground')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
/** Chip: 12/450, muted bg, radius 6. `tone="gold"` = outlined gold (Mochi "Free Trial" badge). */
export function Chip({ children, tone = 'muted', className }: { children: React.ReactNode; tone?: 'muted' | 'gold' | 'good' | 'bad' | 'warn'; className?: string }) {
  const t = {
    muted: 'bg-muted text-muted-foreground',
    gold: 'bg-gold-soft text-gold-ink shadow-[inset_0_0_0_1px_var(--gold)]',
    good: 'bg-success-soft text-success',
    bad: 'bg-destructive-soft text-destructive',
    warn: 'bg-warn-soft text-warn',
  }[tone]
  return <span className={cx('inline-flex items-center h-5 px-1.5 rounded-sm text-xs font-medium whitespace-nowrap', t, className)}>{children}</span>
}
/** iOS-like switch, 32x20. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cx('t relative h-5 w-8 rounded-full shrink-0', checked ? 'bg-gold' : 'bg-muted-2')}>
      <span className={cx('t absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-[0_1px_2px_rgba(0,0,0,.25)]', checked ? 'left-[14px]' : 'left-0.5')} />
    </button>
  )
}

/* ---------- Menu (anchored popover) ---------- */
export function Menu({ trigger, children, align = 'end', className }: { trigger: (open: boolean) => React.ReactNode; children: (close: () => void) => React.ReactNode; align?: 'start' | 'end'; className?: string }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={ref} className={cx('relative inline-block', className)}>
      <div onClick={() => setOpen(o => !o)}>{trigger(open)}</div>
      {open && (
        <div className={cx('absolute z-40 mt-2 min-w-[180px] rounded-xl bg-card p-1 shadow-[var(--shadow-popover)] animate-[dialogIn_.15s_var(--ease-standard)] origin-top', align === 'end' ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
export function MenuItem({ selected, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button className={cx('t w-full text-left h-8 px-2 rounded-md text-sm flex items-center gap-2 hover:bg-muted [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground', selected ? 'bg-muted text-foreground' : 'text-foreground', className)} {...rest}>{children}</button>
  )
}

/* ---------- Dialog / Sheet ---------- */
/** Centered dialog (radius 16, dialog shadow, 150ms scale-in); bottom sheet below 640px. */
export function Dialog({ open, onClose, title, description, children, width = 480 }: { open: boolean; onClose: () => void; title?: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; width?: number }) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 animate-[fadeIn_.15s]" onClick={onClose} />
      <div className="relative w-full max-h-[92vh] overflow-y-auto bg-card rounded-t-2xl sm:rounded-2xl shadow-[var(--shadow-dialog)] animate-[sheetUp_.2s_var(--ease-standard)] sm:animate-[dialogIn_.15s_var(--ease-standard)]" style={{ maxWidth: width }}>
        {(title || description) && (
          <div className="px-6 pt-6">
            {title && <h2 className="text-lg text-foreground">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground mt-2 leading-5">{description}</p>}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
export const Sheet = Dialog

/* ---------- Misc ---------- */
export function ProgressRing({ value, size = 160, stroke = 10, color, track, children }: { value: number; size?: number; stroke?: number; color: string; track?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? 'var(--muted)'} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
/** Mochi empty state: "It's empty here", muted line, optional primary action. */
export function Empty({ title = "It's empty here", text, action, className }: { icon?: string; title?: string; text?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center text-center py-16 px-12', className)}>
      <div className="h-[50px] w-[84px] rounded-lg bg-muted mb-8 relative overflow-hidden">
        <div className="absolute left-3 top-3 h-1.5 w-10 rounded-full bg-muted-2" />
        <div className="absolute left-3 top-6 h-1.5 w-16 rounded-full bg-muted-2" />
        <div className="absolute left-3 top-9 h-1.5 w-6 rounded-full bg-muted-2" />
      </div>
      <div className="text-sm text-foreground">{title}</div>
      {text && <p className="text-sm text-muted-foreground mt-3 leading-6 max-w-xs">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
