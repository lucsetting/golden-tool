import type { Category, Expense, Holding, Income, ISODate, MonthKey } from '../types'
import { ESSENTIALS, OTHER, total } from './calc'
import { currentMonthKey, daysInMonth, monthKey, shiftMonth, todayISO } from './money'

const r2 = (n: number) => Math.round(n * 100) / 100
const mean = (ns: number[]) => (ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : 0)
/** Spending per category per month: `get(categoryId)?.get(month)`. */
function byCategoryMonth(expenses: Expense[]) {
  const map = new Map<string, Map<MonthKey, number>>()
  for (const e of expenses) {
    const m = map.get(e.categoryId) ?? map.set(e.categoryId, new Map()).get(e.categoryId)!
    m.set(monthKey(e.date), (m.get(monthKey(e.date)) ?? 0) + e.amount)
  }
  return map
}
const monthsBack = (endMk: MonthKey, n: number) => Array.from({ length: n }, (_, i) => shiftMonth(endMk, i - (n - 1)))

/* ---------- Trends, forecast, anomaly ---------- */

/** Each category over the `n` months ending at `endMk`, biggest first. `last` is the last complete month; `change` compares
 *  it, in percent, with the average of the three months before it (null when those were empty). */
export function categoryTrends(expenses: Expense[], categories: Category[], endMk: MonthKey = currentMonthKey(), n = 12) {
  const months = monthsBack(endMk, n)
  return [...byCategoryMonth(expenses)].map(([id, m]) => {
    const amounts = months.map(mk => r2(m.get(mk) ?? 0))
    const last = r2(m.get(shiftMonth(endMk, -1)) ?? 0), avg3 = r2(mean([2, 3, 4].map(i => m.get(shiftMonth(endMk, -i)) ?? 0)))
    return { category: categories.find(c => c.id === id) ?? { ...OTHER, id }, months: months.map((month, i) => ({ month, amount: amounts[i] })), sum: total(amounts.map(amount => ({ amount }))), last, avg3, change: avg3 > 0 ? Math.round(((last - avg3) / avg3) * 100) : null }
  }).filter(t => t.sum > 0).sort((a, b) => b.sum - a.sum)
}

/** Where the year ends if nothing changes: the months already over, then for this month and each one left the average of the
 *  last three complete months that have expenses (this month counts as that average, or what is already spent if more).
 *  With no complete month yet, this month's daily average stands in. */
export function forecastYear(expenses: Expense[], today: ISODate = todayISO()) {
  const cur = monthKey(today), year = cur.slice(0, 4), n = Number(cur.slice(5))
  const spent = (mk: MonthKey) => total(expenses.filter(e => monthKey(e.date) === mk))
  const recent = [1, 2, 3].map(i => spent(shiftMonth(cur, -i))).filter(v => v > 0)
  const now = spent(cur)
  const usual = recent.length ? mean(recent) : (now / Number(today.slice(8))) * daysInMonth(cur)
  const months = Array.from({ length: 12 }, (_, i) => {
    const mk = `${year}-${String(i + 1).padStart(2, '0')}`
    return mk < cur ? { month: mk, actual: spent(mk), expected: 0 } : mk === cur ? { month: mk, actual: now, expected: Math.max(0, usual - now) } : { month: mk, actual: 0, expected: usual }
  })
  const soFar = total(months.map(m => ({ amount: m.actual })))
  return { year, soFar, usual: Math.round(usual), forecast: Math.round(soFar + months.reduce((s, m) => s + m.expected, 0)), months, left: 12 - n }
}

export const ANOMALY_PCT = 40, ANOMALY_MIN = 50
/** Categories unusually high this month: the month so far, scaled to the full month, is more than 40 percent and at least
 *  50 above the average of the previous three months. Bills count once and only the rest is scaled; the first week scales
 *  as if seven days had passed, so one early expense is not multiplied by thirty. Months before the first expense do not count. */
export function anomalies(expenses: Expense[], categories: Category[], today: ISODate = todayISO()) {
  if (!expenses.length) return []
  const cur = monthKey(today), dim = daysInMonth(cur), elapsed = Math.max(7, Number(today.slice(8)))
  const first = monthKey(expenses.reduce((a, e) => (e.date < a ? e.date : a), expenses[0].date))
  const prior = [1, 2, 3].map(i => shiftMonth(cur, -i)).filter(mk => mk >= first)
  if (!prior.length) return []
  const bills = byCategoryMonth(expenses.filter(e => e.recurringId))
  return [...byCategoryMonth(expenses)].map(([id, m]) => {
    const soFar = m.get(cur) ?? 0, fixed = bills.get(id)?.get(cur) ?? 0
    const usual = mean(prior.map(mk => m.get(mk) ?? 0)), pace = fixed + ((soFar - fixed) * dim) / elapsed
    return { category: categories.find(c => c.id === id) ?? { ...OTHER, id }, soFar: r2(soFar), pace: Math.round(pace), usual: Math.round(usual), high: usual > 0 && pace > usual * (1 + ANOMALY_PCT / 100) && pace - usual >= ANOMALY_MIN }
  }).filter(a => a.high).sort((a, b) => b.pace - b.usual - (a.pace - a.usual))
}

/* ---------- Year over year, heatmap ---------- */

/** A year month by month beside the year before. A month that has not started is null; `diff` needs expenses in that
 *  month of both years. The totals cover only those months, so they compare like with like. */
export function yearCompare(expenses: Expense[], year: string, today: ISODate = todayISO()) {
  const cur = monthKey(today), prevYear = String(Number(year) - 1)
  const sums = new Map<MonthKey, number>()
  for (const e of expenses) sums.set(monthKey(e.date), (sums.get(monthKey(e.date)) ?? 0) + e.amount)
  const rows = Array.from({ length: 12 }, (_, i) => {
    const mm = String(i + 1).padStart(2, '0'), mk = `${year}-${mm}`
    const now = mk > cur ? null : r2(sums.get(mk) ?? 0), prev = r2(sums.get(`${prevYear}-${mm}`) ?? 0)
    return { month: i, now, prev, diff: now !== null && now > 0 && prev > 0 ? r2(now - prev) : null }
  })
  const both = rows.filter(r => r.diff !== null)
  const now = total(both.map(r => ({ amount: r.now! }))), prev = total(both.map(r => ({ amount: r.prev })))
  return { prevYear, rows, now, prev, diff: both.length ? r2(now - prev) : null, months: both.length, hasPrev: rows.some(r => r.prev > 0) }
}

/** Spending per day of a year, with the amounts that split the days with expenses into four equal groups (for a four-step ramp). */
export function dayHeat(expenses: Expense[], year: string) {
  const days = new Map<ISODate, number>()
  for (const e of expenses) if (e.date.startsWith(year)) days.set(e.date, r2((days.get(e.date) ?? 0) + e.amount))
  const sorted = [...days.values()].filter(v => v > 0).sort((a, b) => a - b)
  const cuts = [0.25, 0.5, 0.75].map(q => sorted[Math.floor(q * sorted.length)] ?? 0)
  /** 0 = nothing spent, 1 to 4 = quarter of the days with expenses it falls in. */
  const level = (date: ISODate) => { const v = days.get(date) ?? 0; return v <= 0 ? 0 : 1 + cuts.filter(c => v >= c).length }
  return { days, level, max: sorted[sorted.length - 1] ?? 0 }
}

/* ---------- Net worth ---------- */

/** Assets minus liabilities. Every debt counts as a liability at what it owes today. */
export function netWorth(assets: Holding[], liabilities: Holding[], debts: { balance: number }[]) {
  const a = total(assets.map(h => ({ amount: h.value }))), l = total([...liabilities.map(h => ({ amount: h.value })), ...debts.map(d => ({ amount: d.balance }))])
  return { assets: a, liabilities: l, net: r2(a - l) }
}

/* ---------- Advanced budgeting ---------- */

/** What a budget carries into the next month: what it left unused, never below zero and never more than one month of it. */
export const rollover = (budget: number, spentLastMonth: number) => Math.min(budget, Math.max(0, r2(budget - spentLastMonth)))

export type Group = 'needs' | 'wants'
export const groupOf = (c: Pick<Category, 'id' | 'group'>): Group => c.group ?? (ESSENTIALS.includes(c.id) ? 'needs' : 'wants')
/** Average income of the last three complete months that have any; this month's when there is none. */
export function averageIncome(incomes: Income[], today: ISODate = todayISO()) {
  const cur = monthKey(today), of = (mk: MonthKey) => total(incomes.filter(i => monthKey(i.date) === mk))
  const recent = [1, 2, 3].map(i => of(shiftMonth(cur, -i))).filter(v => v > 0)
  return Math.round(recent.length ? mean(recent) : of(cur))
}
/** The 50/30/20 rule as budgets: half of the income over the needs categories, 30 percent over the wants, the rest as a
 *  savings target. Inside a group each category gets its share of what the group usually spends (`usual`), or an equal
 *  share when the group has no history. Whole currency units; the rounding remainder goes to the largest category. */
export function fiftyThirtyTwenty(income: number, categories: Pick<Category, 'id' | 'group'>[], usual: Map<string, number>) {
  const needs = Math.round(income * 0.5), wants = Math.round(income * 0.3)
  const budgets = new Map<string, number>()
  for (const [group, amount] of [['needs', needs], ['wants', wants]] as const) {
    const cats = categories.filter(c => groupOf(c) === group)
    const known = cats.some(c => (usual.get(c.id) ?? 0) > 0)
    const weight = (id: string) => (known ? usual.get(id) ?? 0 : 1)
    const sum = cats.reduce((s, c) => s + weight(c.id), 0)
    if (!sum) continue
    for (const c of cats) budgets.set(c.id, Math.floor((amount * weight(c.id)) / sum))
    const top = cats.reduce((a, c) => (weight(c.id) > weight(a.id) ? c : a))
    budgets.set(top.id, budgets.get(top.id)! + amount - cats.reduce((s, c) => s + budgets.get(c.id)!, 0))
  }
  return { needs, wants, savings: Math.round(income) - needs - wants, budgets }
}

/** Budgeted against actual for the `n` months ending at `endMk`, for every category that has a budget. */
export function budgetReport(expenses: Expense[], categories: Category[], endMk: MonthKey = currentMonthKey(), n = 6) {
  const months = monthsBack(endMk, n), spent = byCategoryMonth(expenses)
  const rows = categories.filter(c => c.budget).map(category => {
    const actual = months.map(mk => r2(spent.get(category.id)?.get(mk) ?? 0))
    return { category, budget: category.budget!, actual, within: actual.filter(a => a <= category.budget!).length, average: Math.round(mean(actual)) }
  })
  return { months, rows }
}
