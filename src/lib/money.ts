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
  const yd = new Date(); yd.setDate(yd.getDate() - 1)
  if (iso === `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, '0')}-${String(yd.getDate()).padStart(2, '0')}`) return 'Yesterday'
  return dateFmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(dt)
}
/** Short label of the month `n` months from now. */
export const monthAhead = (n: number) => monthLabel(shiftMonth(currentMonthKey(), n), 'short')
