import type { Category, Expense, Recurring } from '../types'
import { currentMonthKey, daysInMonth, fmt, monthKey, monthLabel, shiftMonth, todayISO } from './money'

export function expensesForMonth(expenses: Expense[], mk: string): Expense[] {
  return expenses.filter(e => monthKey(e.date) === mk).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
}
export function total(expenses: { amount: number }[]): number {
  return Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100
}

export interface CategorySlice { category: Category; amount: number; pct: number; count: number }
/** Breakdown by category, sorted desc. pct is 0..100 of the month total. */
export function byCategory(expenses: Expense[], categories: Category[]): CategorySlice[] {
  const sum = total(expenses) || 1
  const map = new Map<string, { amount: number; count: number }>()
  for (const e of expenses) {
    const cur = map.get(e.categoryId) ?? { amount: 0, count: 0 }
    cur.amount += e.amount; cur.count++
    map.set(e.categoryId, cur)
  }
  return [...map.entries()]
    .map(([id, v]) => {
      const category = categories.find(c => c.id === id) ?? { id, name: 'Other', icon: 'Circle', color: '#8E919A' }
      return { category, amount: Math.round(v.amount * 100) / 100, pct: Math.round((v.amount / sum) * 1000) / 10, count: v.count }
    })
    .sort((a, b) => b.amount - a.amount)
}

export type Pace = 'ahead' | 'on-track' | 'behind' | 'over'
export interface MonthStats {
  spent: number
  limit: number
  remaining: number
  pctUsed: number // 0..100+
  daysInMonth: number
  dayOfMonth: number // 1-based; equals daysInMonth for past months
  daysLeft: number // including today; 0 for past months
  safePerDay: number // remaining / daysLeft
  avgPerDay: number // spent / elapsed days
  projected: number // bills once + the daily average of the rest over the whole month (current month), or spent (past)
  pace: Pace
  expectedByNow: number // bills already posted + the rest of the limit * elapsed/dim
}
/** Active bills of the current month that have no expense yet. */
function billsDue(expenses: Expense[], mk: string, recurring: Recurring[]): Recurring[] {
  return mk === currentMonthKey() ? recurring.filter(r => r.active && !expenses.some(e => e.recurringId === r.id)) : []
}
/** `expenses` are the month's. Bills (expenses with a `recurringId`, plus `recurring` items not posted yet) count once;
 *  only the remaining, variable spending is spread over the days. */
export function monthStats(expenses: Expense[], mk: string, limit: number, recurring: Recurring[] = []): MonthStats {
  const spent = total(expenses)
  const dim = daysInMonth(mk)
  const cur = currentMonthKey()
  const isCurrent = mk === cur
  const isPast = mk < cur
  const dayOfMonth = isCurrent ? Number(todayISO().slice(8, 10)) : isPast ? dim : 0
  const daysLeft = isCurrent ? dim - dayOfMonth + 1 : isPast ? 0 : dim
  const remaining = Math.round((limit - spent) * 100) / 100
  const elapsed = Math.max(dayOfMonth, 1)
  const avgPerDay = spent / elapsed
  const posted = total(expenses.filter(e => e.recurringId))
  const due = total(billsDue(expenses, mk, recurring))
  const projected = isCurrent ? Math.round(posted + due + ((spent - posted) / elapsed) * dim) : spent
  const expectedByNow = posted + Math.max(0, limit - posted - due) * (elapsed / dim)
  const pctUsed = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0
  let pace: Pace = 'on-track'
  if (spent > limit) pace = 'over'
  else if (limit > 0 && spent > expectedByNow * 1.1) pace = 'behind'
  else if (limit > 0 && spent < expectedByNow * 0.8) pace = 'ahead'
  return {
    spent, limit, remaining, pctUsed, daysInMonth: dim, dayOfMonth, daysLeft,
    safePerDay: daysLeft > 0 ? Math.max(0, remaining) / daysLeft : 0,
    avgPerDay, projected, pace, expectedByNow,
  }
}

/** Cumulative spend per day of the month, for a line/area chart. `ideal` is the limit pace: bills on their day,
 *  the rest of the limit spread evenly. It equals `monthStats().expectedByNow` today and the limit on the last day. */
export function dailyCumulative(expenses: Expense[], mk: string, limit: number, recurring: Recurring[] = []) {
  const dim = daysInMonth(mk)
  const perDay = new Array(dim).fill(0), bills = new Array(dim).fill(0)
  for (const e of expenses) {
    const i = Number(e.date.slice(8, 10)) - 1
    perDay[i] += e.amount
    if (e.recurringId) bills[i] += e.amount
  }
  for (const r of billsDue(expenses, mk, recurring)) bills[Math.min(r.dayOfMonth, dim) - 1] += r.amount
  const rest = Math.max(0, limit - total(bills.map(amount => ({ amount }))))
  const cur = currentMonthKey()
  const lastDay = mk === cur ? Number(todayISO().slice(8, 10)) : mk < cur ? dim : 0
  let acc = 0, accBills = 0
  return Array.from({ length: dim }, (_, i) => {
    acc += perDay[i]; accBills += bills[i]
    return { day: i + 1, spent: i < lastDay ? Math.round(acc * 100) / 100 : null, ideal: Math.min(limit, Math.round(accBills + (rest * (i + 1)) / dim)) }
  })
}

/** Last n months totals, oldest first. */
export function monthlyHistory(expenses: Expense[], n = 6, endMk = currentMonthKey()) {
  return Array.from({ length: n }, (_, i) => {
    const mk = shiftMonth(endMk, i - (n - 1))
    return { month: mk, spent: total(expensesForMonth(expenses, mk)) }
  })
}

/** Debt payoff schedule (snowball = smallest balance first, avalanche = highest APR first). */
export interface DebtLike { id: string; name: string; balance: number; apr: number; minPayment: number }
export function payoffPlan(debts: DebtLike[], extraPerMonth: number, method: 'snowball' | 'avalanche') {
  const order = [...debts].sort((a, b) => method === 'snowball' ? a.balance - b.balance : b.apr - a.apr)
  const bal = new Map(order.map(d => [d.id, d.balance]))
  let months = 0, interestPaid = 0
  const payoffMonth = new Map<string, number>()
  while ([...bal.values()].some(b => b > 0.005) && months < 600) {
    months++
    let extra = extraPerMonth
    for (const d of order) {
      const b = bal.get(d.id)!
      if (b <= 0) continue
      const interest = (b * (d.apr / 100)) / 12
      interestPaid += interest
      bal.set(d.id, b + interest)
    }
    for (const d of order) {
      const b = bal.get(d.id)!
      if (b <= 0) continue
      const pay = Math.min(b, d.minPayment + extra)
      extra = Math.max(0, extra - Math.max(0, pay - d.minPayment)) // only the first open debt absorbs extra
      const nb = b - pay
      bal.set(d.id, nb)
      if (nb <= 0.005) { payoffMonth.set(d.id, months); extra += d.minPayment } // roll freed payment forward
    }
  }
  return { months, interestPaid: Math.round(interestPaid * 100) / 100, payoffMonth }
}

/** Month-by-month payments, same rules as payoffPlan. Row i = i-th month from now; pays[id] = amount paid that month (absent once paid off). */
export interface ScheduleRow { month: number; pays: Record<string, number>; total: number; paidOff: string[] }
export function paymentSchedule(debts: DebtLike[], extraPerMonth: number, method: 'snowball' | 'avalanche'): ScheduleRow[] {
  const order = [...debts].sort((a, b) => method === 'snowball' ? a.balance - b.balance : b.apr - a.apr)
  const bal = new Map(order.map(d => [d.id, d.balance]))
  const rows: ScheduleRow[] = []
  while ([...bal.values()].some(b => b > 0.005) && rows.length < 600) {
    let extra = extraPerMonth
    const pays: Record<string, number> = {}, paidOff: string[] = []
    for (const d of order) {
      const b = bal.get(d.id)!
      if (b > 0) bal.set(d.id, b + (b * (d.apr / 100)) / 12)
    }
    for (const d of order) {
      const b = bal.get(d.id)!
      if (b <= 0) continue
      const pay = Math.min(b, d.minPayment + extra)
      extra = Math.max(0, extra - Math.max(0, pay - d.minPayment))
      const nb = b - pay
      bal.set(d.id, nb)
      pays[d.id] = Math.round(pay * 100) / 100
      if (nb <= 0.005) { bal.set(d.id, 0); paidOff.push(d.id); extra += d.minPayment }
    }
    rows.push({ month: rows.length + 1, pays, total: Math.round(Object.values(pays).reduce((s, n) => s + n, 0) * 100) / 100, paidOff })
  }
  return rows
}

/** Average monthly spend on essential categories over the last `months` full months that have any expense (current month if none). */
export function essentialsPerMonth(expenses: Expense[], categoryIds: string[] = ['housing', 'bills', 'groceries', 'transport', 'health'], months = 3): number {
  const cur = currentMonthKey()
  const ess = (mk: string) => total(expensesForMonth(expenses, mk).filter(e => categoryIds.includes(e.categoryId)))
  const mks = Array.from({ length: months }, (_, i) => shiftMonth(cur, -(i + 1))).filter(mk => expenses.some(e => monthKey(e.date) === mk))
  if (!mks.length) return Math.round(ess(cur))
  return Math.round(mks.reduce((s, mk) => s + ess(mk), 0) / mks.length)
}

/** What is left of the limit if the month ends at its projection. */
export function safeToSave(stats: MonthStats): number {
  return Math.max(0, Math.round(stats.limit - stats.projected))
}

/** Plain-English summary of one month, for copy/paste. */
export function monthSummary(expenses: Expense[], categories: Category[], mk: string, limit: number, currency: string): string {
  const list = expensesForMonth(expenses, mk)
  const f = (n: number) => fmt(n, currency)
  if (!list.length) return `${monthLabel(mk)}: no expenses recorded.`
  const spent = total(list)
  const prev = total(expensesForMonth(expenses, shiftMonth(mk, -1)))
  const dim = daysInMonth(mk)
  const cur = currentMonthKey()
  const elapsed = mk === cur ? Number(todayISO().slice(8, 10)) : dim
  const days = new Set(list.map(e => e.date))
  const noSpend = Array.from({ length: elapsed }, (_, i) => `${mk}-${String(i + 1).padStart(2, '0')}`).filter(d => !days.has(d)).length
  const big = list.reduce((a, b) => (b.amount > a.amount ? b : a))
  const vsLimit = limit > 0 ? `${f(spent)} of your ${f(limit)} limit (${f(Math.abs(limit - spent))} ${spent > limit ? 'over' : 'under'}).` : `${f(spent)}.`
  const vsPrev = prev > 0 ? `${Math.abs(Math.round(((spent - prev) / prev) * 100))}% ${spent >= prev ? 'more' : 'less'} than the month before (${f(prev)}).` : 'No data for the month before.'
  const top = byCategory(list, categories).slice(0, 3).map((s, i) => `${i + 1}. ${s.category.name}: ${f(s.amount)}`).join('\n')
  return [
    `${monthLabel(mk)}`, '',
    `Spent ${vsLimit}`, vsPrev, '',
    'Top categories', top, '',
    `Biggest purchase: ${big.name}, ${f(big.amount)} on ${big.date}.`,
    `${list.length} expense${list.length === 1 ? '' : 's'}, ${noSpend} no-spend day${noSpend === 1 ? '' : 's'}.`,
  ].join('\n')
}
