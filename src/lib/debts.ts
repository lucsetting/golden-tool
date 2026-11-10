import type { Debt, DebtPlan, ISODate, MonthKey, Payment } from '../types'
import { currentMonthKey, monthKey, shiftMonth, todayISO } from './money'

/** A plan that is not paid off after this many months never will be: the payments do not cover the interest. */
export const MAX_MONTHS = 600
export type DebtLike = Pick<Debt, 'id' | 'name' | 'balance' | 'apr' | 'minPayment' | 'startDate'>
const r2 = (n: number) => Math.round(n * 100) / 100
const sum = (ns: number[]) => ns.reduce((s, n) => s + n, 0)

/** One month of a payoff plan. `pays[id]` is absent once that debt is paid off; `balance` is what all debts owe after the month. */
export interface ScheduleRow { month: number; pays: Record<string, number>; total: number; paidOff: string[]; balance: number }

/** The payoff plan month by month; row n is the n-th month after `startMk`. Every open debt gets a month of interest and
 *  its minimum payment. What the monthly amount has left (the extra, a one-off payment, the minimums of debts already paid)
 *  goes to the first open debt in strategy order: smallest starting balance for snowball, highest rate for avalanche.
 *  A debt whose `startDate` falls after `startMk` joins the plan the month after it starts. */
export function simulate(debts: DebtLike[], plan: DebtPlan, startMk: MonthKey = currentMonthKey(), maxMonths = MAX_MONTHS) {
  const order = [...debts].sort((a, b) => (plan.method === 'snowball' ? a.balance - b.balance : b.apr - a.apr))
  const bal = new Map(order.map(d => [d.id, d.balance]))
  const interestBy = new Map(order.map(d => [d.id, 0]))
  const payoffMonth = new Map<string, number>()
  const rows: ScheduleRow[] = []
  const isOpen = (d: DebtLike) => bal.get(d.id)! > 0.005
  /** Gives `pool` to the open debts in order and returns what is left of it. */
  const spread = (pool: number, among: DebtLike[], pays: Record<string, number>) => {
    for (const d of among) {
      if (pool <= 0 || !isOpen(d)) continue
      const x = Math.min(bal.get(d.id)!, pool)
      bal.set(d.id, bal.get(d.id)! - x); pays[d.id] = (pays[d.id] ?? 0) + x; pool -= x
    }
    return pool
  }
  const close = (among: DebtLike[], month: number) => among.filter(d => !isOpen(d) && !payoffMonth.has(d.id) && d.balance > 0).map(d => { bal.set(d.id, 0); payoffMonth.set(d.id, month); return d.id })
  if (plan.oneOff?.month === startMk) { spread(plan.oneOff.amount, order, {}); close(order, 0) }

  while (order.some(isOpen) && rows.length < maxMonths) {
    const month = rows.length + 1, mk = shiftMonth(startMk, month)
    const active = order.filter(d => !d.startDate || monthKey(d.startDate) < mk)
    const pays: Record<string, number> = {}
    let pool = plan.extra + (plan.oneOff?.month === mk ? plan.oneOff.amount : 0)
    for (const d of active) {
      if (!isOpen(d)) { pool += d.minPayment; continue }
      const interest = (bal.get(d.id)! * d.apr) / 1200
      const pay = Math.min(bal.get(d.id)! + interest, d.minPayment)
      interestBy.set(d.id, interestBy.get(d.id)! + interest)
      bal.set(d.id, bal.get(d.id)! + interest - pay); pays[d.id] = pay; pool += d.minPayment - pay
    }
    spread(pool, active, pays)
    for (const id in pays) pays[id] = r2(pays[id])
    rows.push({ month, pays, total: r2(sum(Object.values(pays))), paidOff: close(active, month), balance: r2(sum([...bal.values()])) })
  }
  return { rows, months: rows.length, interestPaid: r2(sum([...interestBy.values()])), interestBy, payoffMonth, left: r2(sum([...bal.values()])) }
}
export type Simulation = ReturnType<typeof simulate>
/** True when the plan never reaches zero. */
export const neverPaid = (s: { months: number }) => s.months >= MAX_MONTHS

/** What a debt owes on `today`: the balance it started with, a month of interest at the start of each later month
 *  (the plan's own rule), and every payment logged up to today taken off. */
export function owed(d: Debt, payments: Payment[], today: ISODate = todayISO()): number {
  const mine = payments.filter(p => p.debtId === d.id && p.date <= today)
  const start = monthKey(d.startDate ?? today), cur = monthKey(today)
  let b = d.balance
  for (let mk = start; mk <= cur; mk = shiftMonth(mk, 1)) {
    if (mk > start) b += (Math.max(0, b) * d.apr) / 1200
    b -= sum(mine.filter(p => (mk === start ? monthKey(p.date) <= mk : monthKey(p.date) === mk)).map(p => p.amount))
  }
  return Math.max(0, r2(b))
}
/** The debts as they stand today, ready for a plan that starts now. */
export const debtsNow = (debts: Debt[], payments: Payment[], today: ISODate = todayISO()): DebtLike[] =>
  debts.map(d => ({ id: d.id, name: d.name, apr: d.apr, minPayment: d.minPayment, balance: owed(d, payments, today) }))

export type Progress = 'ahead' | 'on' | 'due' | 'behind'
/** The real total balance against what the payoff plan expected for this month, had it run since the first debt was entered.
 *  `due`: on plan through last month, with `by` still to pay this month. `behind`: `by` above the plan even before this month's payment. */
export function planProgress(debts: Debt[], payments: Payment[], plan: DebtPlan, today: ISODate = todayISO()) {
  if (!debts.length) return null
  const cur = monthKey(today)
  const since = debts.reduce((a, d) => (d.startDate && monthKey(d.startDate) < a ? monthKey(d.startDate) : a), cur)
  let n = 0
  for (let mk = since; mk < cur; mk = shiftMonth(mk, 1)) n++
  const sim = simulate(debts, plan, since, n)
  const row = sim.rows[n - 1]
  const expected = sim.left, before = row ? r2(row.balance + row.total) : expected
  const real = r2(sum(debts.map(d => owed(d, payments, today))))
  const state: Progress = real < expected - 0.5 ? 'ahead' : real <= expected + 0.5 ? 'on' : real <= before + 0.5 ? 'due' : 'behind'
  return { since, expected, real, state, by: r2(Math.abs(real - (state === 'behind' ? before : expected))) }
}

/** One debt paid with its minimum alone, outside any plan. */
export function minimumOnly(d: DebtLike) {
  const s = simulate([{ ...d, startDate: undefined }], { method: 'avalanche', extra: 0 })
  return { months: s.months, interest: s.interestPaid, never: neverPaid(s) }
}
