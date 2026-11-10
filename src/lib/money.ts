// Building an Intl formatter costs far more than using one, and lists format hundreds of values: keep one per option set.
const numFmts = new Map<string, Intl.NumberFormat>()
const dateFmts = new Map<string, Intl.DateTimeFormat>()
function dateFmt(opts: Intl.DateTimeFormatOptions) {
  const k = JSON.stringify(opts)
  let f = dateFmts.get(k)
  if (!f) dateFmts.set(k, f = new Intl.DateTimeFormat('en-US', opts))
  return f
}
export function fmt(amount: number, currency = 'USD', opts: Intl.NumberFormatOptions = {}) {
  const k = currency + JSON.stringify(opts)
  let f = numFmts.get(k)
  if (!f) numFmts.set(k, f = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2, ...opts }))
  return f.format(amount)
}
export function fmtCompact(amount: number, currency = 'USD') {
  return fmt(amount, currency, { notation: Math.abs(amount) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: Math.abs(amount) >= 10000 ? 1 : 0 })
}
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'BRL', 'MXN', 'CHF'] as const

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** The date `n` days after `iso` (before, when negative). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
export function monthKey(date: string): string {
  return date.slice(0, 7)
}
export function currentMonthKey(): string {
  return monthKey(todayISO())
}
export function shiftMonth(mk: string, delta: number): string {
  const [y, m] = mk.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export function daysInMonth(mk: string): number {
  const [y, m] = mk.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
export function monthLabel(mk: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = mk.split('-').map(Number)
  return dateFmt({ month: style, year: 'numeric' }).format(new Date(y, m - 1, 1))
}
export function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const today = todayISO()
  if (iso === today) return 'Today'
  if (iso === addDays(today, -1)) return 'Yesterday'
  if (iso === addDays(today, 1)) return 'Tomorrow'
  return dateFmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(dt)
}
/** Short label of the month `n` months from now. */
export const monthAhead = (n: number) => monthLabel(shiftMonth(currentMonthKey(), n), 'short')

/** "1 bill", "2 bills"; pass the plural when it is not the singular plus s. */
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`

/** "$1,234.56", "-12.00", "(12.00)", "12,50 €" and "1.234,56" as numbers. NaN when the text is not an amount. */
export function parseMoney(s: string): number {
  let x = s.replace(/[^\d.,()+-]/g, '')
  if (!/\d/.test(x)) return NaN
  const negative = x.includes('-') || /^\(.*\)$/.test(x)
  x = x.replace(/[()+-]/g, '')
  // A comma followed by one or two digits at the end is a decimal comma; any other comma groups thousands.
  x = /,\d{1,2}$/.test(x) ? x.replace(/\./g, '').replace(',', '.') : x.replace(/,/g, '')
  const n = Number(x)
  return negative ? -n : n
}
/** What the customer typed in an amount field, in cents. "12,50" and "12.5" both work. */
export const parseAmount = (s: string) => Math.round(parseMoney(s) * 100) / 100
