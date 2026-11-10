import type { Category, Expense, Income, ISODate, Recurring } from '../types'
import { addDays, currentMonthKey, daysInMonth, fmt, monthKey, monthLabel, shiftMonth, todayISO } from './money'

export function expensesForMonth(expenses: Expense[], mk: string): Expense[] {
  return expenses.filter(e => monthKey(e.date) === mk).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
}
export function total(expenses: { amount: number }[]): number {
  return Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100
}

/** Stands in for a category that no longer exists. */
export const OTHER: Category = { id: 'other', name: 'Other', icon: 'Circle', color: '#8E919A' }

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
      const category = categories.find(c => c.id === id) ?? { ...OTHER, id }
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
  for (const r of billsDue(expenses, mk, recurring)) bills[Number(dayIn(r.dayOfMonth, mk).slice(8)) - 1] += r.amount
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

/** A plan that is not paid off after this many months never will be: the payments do not cover the interest. */
export const MAX_MONTHS = 600
/** Debt payoff schedule (snowball = smallest balance first, avalanche = highest APR first). */
export interface DebtLike { id: string; name: string; balance: number; apr: number; minPayment: number }
export function payoffPlan(debts: DebtLike[], extraPerMonth: number, method: 'snowball' | 'avalanche') {
  const order = [...debts].sort((a, b) => method === 'snowball' ? a.balance - b.balance : b.apr - a.apr)
  const bal = new Map(order.map(d => [d.id, d.balance]))
  let months = 0, interestPaid = 0
  const payoffMonth = new Map<string, number>()
  while ([...bal.values()].some(b => b > 0.005) && months < MAX_MONTHS) {
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
  while ([...bal.values()].some(b => b > 0.005) && rows.length < MAX_MONTHS) {
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

/* ---------- Bills and repeating income ---------- */

/** The date a monthly day falls on in a month; a day the month does not have falls on its last day. */
export function dayIn(day: number, mk: string): ISODate {
  return `${mk}-${String(Math.max(1, Math.min(Math.round(day) || 1, daysInMonth(mk)))).padStart(2, '0')}`
}
/** What repeats, has come due and is not in the lists yet: bills as expenses, repeating income as income.
 *  `recurringApplied` holds the months already swept (YYYY-MM) and one key per posting (id@YYYY-MM),
 *  so a posting the customer deleted is not posted again. Months nobody opened the app in are caught up, a year back at most. */
export function postings(s: { expenses: Expense[]; recurring: Recurring[]; incomes: Income[]; recurringApplied: string[] }, today: ISODate) {
  const cur = monthKey(today), done = new Set(s.recurringApplied)
  const last = s.recurringApplied.filter(k => k.length === 7).sort().pop()
  const from = (start: string, back: number) => (start < shiftMonth(cur, -back) ? shiftMonth(cur, -back) : start)
  const expenses: Omit<Expense, 'id' | 'createdAt'>[] = [], incomes: Omit<Income, 'id' | 'createdAt'>[] = [], applied: string[] = []
  for (let mk = from(last && last < cur ? shiftMonth(last, 1) : cur, 11); mk <= cur; mk = shiftMonth(mk, 1)) {
    for (const r of s.recurring) {
      const key = `${r.id}@${mk}`, date = dayIn(r.dayOfMonth, mk)
      if (!r.active || date > today || done.has(key)) continue
      applied.push(key)
      if (!s.expenses.some(e => e.recurringId === r.id && monthKey(e.date) === mk)) expenses.push({ amount: r.amount, categoryId: r.categoryId, name: r.name, date, recurringId: r.id })
    }
    if (!done.has(mk)) applied.push(mk)
  }
  for (const t of s.incomes) {
    if (!t.repeat) continue
    for (let mk = from(shiftMonth(monthKey(t.date), 1), 23); mk <= cur; mk = shiftMonth(mk, 1)) {
      const key = `${t.id}@${mk}`, date = dayIn(Number(t.date.slice(8)), mk)
      if (date > today || done.has(key)) continue
      applied.push(key)
      if (!s.incomes.some(i => i.repeatOf === t.id && monthKey(i.date) === mk)) incomes.push({ amount: t.amount, source: t.source, date, repeatOf: t.id })
    }
  }
  return { expenses, incomes, applied }
}
/** Active bills that fall in the `days` days after `today`, soonest first. Today's bills are already posted as expenses. */
export function dueSoon(recurring: Recurring[], today: ISODate, days = 7): { bill: Recurring; date: ISODate }[] {
  const end = addDays(today, days), cur = monthKey(today)
  return recurring.filter(r => r.active)
    .flatMap(bill => [cur, shiftMonth(cur, 1)].map(mk => ({ bill, date: dayIn(bill.dayOfMonth, mk) })))
    .filter(x => x.date > today && x.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || b.bill.amount - a.bill.amount)
}
/** Bills flagged as subscriptions with what each costs in a year. The total leaves paused ones out. */
export function subscriptions(recurring: Recurring[]) {
  const items = recurring.filter(r => r.subscription).map(bill => ({ bill, yearly: Math.round(bill.amount * 1200) / 100 })).sort((a, b) => b.yearly - a.yearly)
  return { items, monthly: total(items.filter(i => i.bill.active).map(i => i.bill)), yearly: total(items.filter(i => i.bill.active).map(i => ({ amount: i.yearly }))) }
}

/* ---------- Income and cash flow ---------- */

/** Income, expenses and what is left of the income for one month. `rate` is the savings rate in percent, null with no income. */
export function cashFlow(incomes: Income[], expenses: Expense[], mk: string) {
  const income = total(incomes.filter(i => monthKey(i.date) === mk)), spent = total(expenses.filter(e => monthKey(e.date) === mk))
  const net = Math.round((income - spent) * 100) / 100
  return { month: mk, income, spent, net, rate: income > 0 ? Math.round((net / income) * 1000) / 10 : null }
}
/** The last n months of cash flow, oldest first. */
export function cashFlowHistory(incomes: Income[], expenses: Expense[], n = 6, endMk = currentMonthKey()) {
  return Array.from({ length: n }, (_, i) => cashFlow(incomes, expenses, shiftMonth(endMk, i - (n - 1))))
}

/* ---------- Budgets ---------- */

export type BudgetState = 'none' | 'ok' | 'warn' | 'over'
/** Under 80 percent of the budget is fine, from 80 to 100 is a warning, above it is over. */
export function budgetState(spent: number, budget?: number): BudgetState {
  if (!budget || budget <= 0) return 'none'
  return spent > budget ? 'over' : spent >= budget * 0.8 ? 'warn' : 'ok'
}

/* ---------- Category rules ---------- */

/** A merchant name as rules store it: lower case, digits and punctuation gone, single spaces. */
export function normName(s: string): string {
  return s.toLowerCase().replace(/['’.]/g, '').replace(/[^\p{L}]+/gu, ' ').trim()
}
/** The category remembered for a name. A longer text (a bank line) takes the longest rule it contains as whole words. */
export function ruleFor(rules: Record<string, string>, name: string): string | undefined {
  const n = normName(name)
  if (!n) return undefined
  if (rules[n]) return rules[n]
  let best = ''
  for (const k in rules) if (k.length >= 3 && k.length > best.length && ` ${n} `.includes(` ${k} `)) best = k
  return best ? rules[best] : undefined
}

/* ---------- Weekly recap and streak ---------- */

/** The last seven days against the seven before. Null until the first expense is seven days old. */
export function weeklyRecap(expenses: Expense[], categories: Category[], today: ISODate = todayISO()) {
  const start = addDays(today, -6), before = addDays(today, -13)
  if (!expenses.some(e => e.date <= start)) return null
  const week = expenses.filter(e => e.date >= start && e.date <= today)
  const spent = total(week), prev = total(expenses.filter(e => e.date >= before && e.date < start))
  const diff = Math.round((spent - prev) * 100) / 100
  return {
    spent, prev, diff, count: week.length,
    pct: prev > 0 ? Math.round((diff / prev) * 100) : null,
    top: byCategory(week, categories)[0] ?? null,
    biggest: week.length ? week.reduce((a, b) => (b.amount > a.amount ? b : a)) : null,
  }
}
/** Days in a row, ending today, with the month's spending at or under the limit pace (the line on the Home chart);
 *  the longest such run so far; and closed months in a row at or under the monthly limit. Nothing before the first expense counts. */
export function streak(expenses: Expense[], limit: number, recurring: Recurring[] = []): { days: number; longest: number; months: number } {
  if (!(limit > 0) || !expenses.length) return { days: 0, longest: 0, months: 0 }
  const first = expenses.reduce((a, e) => (e.date < a ? e.date : a), expenses[0].date)
  const byMonth = new Map<string, Expense[]>()
  for (const e of expenses) { const k = monthKey(e.date); byMonth.set(k, [...(byMonth.get(k) ?? []), e]) }
  const cur = currentMonthKey()
  let days = 0, longest = 0
  for (let mk = monthKey(first); mk <= cur; mk = shiftMonth(mk, 1)) {
    dailyCumulative(byMonth.get(mk) ?? [], mk, limit, mk === cur ? recurring : []).forEach(({ spent, ideal }, i) => {
      if (spent === null || dayIn(i + 1, mk) < first) return // a day that has not come yet, or one before the first expense
      days = spent <= ideal + 0.5 ? days + 1 : 0
      longest = Math.max(longest, days)
    })
  }
  let months = 0
  for (let mk = shiftMonth(cur, -1); mk >= monthKey(first) && total(byMonth.get(mk) ?? []) <= limit; mk = shiftMonth(mk, -1)) months++
  return { days, longest, months }
}
