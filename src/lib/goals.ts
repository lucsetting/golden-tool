import type { Challenge, Contribution, Expense, Goal, ISODate, MonthKey } from '../types'
import { addDays, monthKey, round2 as r2, shiftMonth, todayISO } from './money'

const time = (iso: ISODate) => new Date(iso + 'T00:00').getTime()
const daysBetween = (a: ISODate, b: ISODate) => Math.round((time(b) - time(a)) / 864e5)

/** A goal with what is saved toward it: the sum of its contributions. */
export type GoalNow = Goal & { saved: number }
export function withSaved(goals: Goal[], contributions: Contribution[]): GoalNow[] {
  const saved = new Map<string, number>()
  for (const c of contributions) saved.set(c.goalId, (saved.get(c.goalId) ?? 0) + c.amount)
  return goals.map(g => ({ ...g, saved: r2(saved.get(g.id) ?? 0) }))
}
/** A goal's contributions, oldest first. */
export const contributionsOf = (goalId: string, contributions: Contribution[]) =>
  contributions.filter(c => c.goalId === goalId).sort((a, b) => a.date.localeCompare(b.date))

/** Why a goal asks for nothing per month, or null when it does ask. */
export function goalStatus(g: GoalNow, today: ISODate = todayISO()) {
  return g.saved >= g.target ? 'Goal reached' : !g.deadline ? 'No deadline' : g.deadline <= today ? 'Deadline passed' : null
}
/** Amount to set aside per month from now to hit the deadline; 0 when reached, with no deadline or with the deadline passed.
 *  ponytail: a month is 30.44 days here, so the count of months left can be one off around a month end. */
export function monthlyNeed(g: GoalNow, today: ISODate = todayISO()): number {
  const left = g.target - g.saved
  if (left <= 0 || !g.deadline) return 0
  const days = daysBetween(today, g.deadline)
  return days <= 0 ? 0 : left / Math.max(1, Math.ceil(days / 30.44))
}

/** What the customer set aside per month over the last three months (91 days). The opening amount is not pace.
 *  ponytail: always divided by three, so a goal younger than three months reads slower than it is; divide by its age if customers notice. */
export function pacePerMonth(mine: Contribution[], today: ISODate = todayISO()): number {
  const from = addDays(today, -91)
  return r2(mine.filter(c => c.source !== 'opening' && c.date > from && c.date <= today).reduce((s, c) => s + c.amount, 0) / 3)
}

export interface Milestone { pct: 25 | 50 | 75 | 100; amount: number; reached?: ISODate; expected?: MonthKey }
/** The quarter marks of a goal: the day each was reached, or the month it is expected at the pace of the last three months. */
export function milestones(g: Goal, mine: Contribution[], today: ISODate = todayISO()): Milestone[] {
  const sorted = contributionsOf(g.id, mine), saved = sorted.reduce((s, c) => s + c.amount, 0), pace = pacePerMonth(sorted, today)
  return ([25, 50, 75, 100] as const).map(pct => {
    const amount = r2((g.target * pct) / 100)
    if (saved >= amount - 0.005) {
      let acc = 0
      return { pct, amount, reached: sorted.find(c => (acc += c.amount) >= amount - 0.005)?.date ?? today }
    }
    return { pct, amount, expected: pace > 0 ? shiftMonth(monthKey(today), Math.ceil((amount - saved) / pace)) : undefined }
  })
}

/** Points for the chart of a goal: what was saved after each contribution, and the straight line from the first
 *  contribution to the target on the deadline. `saved` stops at today; `pace` is null without a deadline ahead of the start. */
export function paceSeries(g: Goal, mine: Contribution[], today: ISODate = todayISO()) {
  const sorted = contributionsOf(g.id, mine).filter(c => c.date <= today)
  const start = sorted[0]?.date ?? today
  const dates = [...new Set([...sorted.map(c => c.date), today, ...(g.deadline && g.deadline > today ? [g.deadline] : [])])].sort()
  const at = (d: ISODate) => r2(sorted.filter(c => c.date <= d).reduce((s, c) => s + c.amount, 0))
  const from = at(start), span = g.deadline && g.deadline > start ? daysBetween(start, g.deadline) : 0
  return dates.map(d => ({
    date: d, t: time(d),
    saved: d <= today ? at(d) : null,
    pace: span ? r2(from + ((g.target - from) * Math.min(span, daysBetween(start, d))) / span) : null,
  }))
}

/** What went to the goals that still exist in the month of `today`. The opening amount is not this month's saving. */
export function setAside(contributions: Contribution[], goals: Goal[], today: ISODate = todayISO()) {
  const mk = monthKey(today), ids = new Set(goals.map(g => g.id))
  return r2(contributions.filter(c => ids.has(c.goalId) && monthKey(c.date) === mk && c.source !== 'opening').reduce((s, c) => s + c.amount, 0))
}

/** This month's amount for each goal, in priority order: each goal first gets what it needs per month for its deadline,
 *  then whatever is left goes to the first goal that still has room. A goal with no deadline only receives from what is left. */
export function autoPlan(goals: GoalNow[], available: number, today: ISODate = todayISO()): { goal: GoalNow; amount: number }[] {
  let left = Math.max(0, r2(available))
  const room = (g: GoalNow, got: number) => Math.max(0, r2(g.target - g.saved - got))
  const plan = goals.map(goal => {
    const amount = r2(Math.min(left, room(goal, 0), monthlyNeed(goal, today)))
    left = r2(left - amount)
    return { goal, amount }
  })
  for (const p of plan) {
    const more = Math.min(left, room(p.goal, p.amount))
    p.amount = r2(p.amount + more); left = r2(left - more)
  }
  return plan
}

/** Where a 52-week challenge stands. Week n asks for n times the base amount. `next` is the earliest week that has come and is not done. */
export function week52(c: Challenge, today: ISODate = todayISO()) {
  const base = c.base ?? 0
  const week = Math.min(52, Math.max(1, Math.floor(daysBetween(c.start, today) / 7) + 1))
  const next = Array.from({ length: week }, (_, i) => i + 1).find(n => !c.done.includes(n))
  return {
    week, next, amount: next ? r2(next * base) : 0,
    saved: r2(c.done.reduce((s, n) => s + n * base, 0)), total: r2(base * 1378), // 1 + 2 + … + 52
    finished: c.done.length >= 52,
    nextStarts: addDays(c.start, week * 7),
  }
}

/** The seven days of a no-spend week, checked from the expenses: a day is broken by any expense outside the allowed
 *  categories. Bills do not count, they were due anyway. `kept` only once all seven days are over. */
export function noSpendWeek(c: Challenge, expenses: Expense[], today: ISODate = todayISO()) {
  const allowed = new Set(c.essentials ?? [])
  const end = c.ended && c.ended < addDays(c.start, 6) ? c.ended : addDays(c.start, 6)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(c.start, i)
    const broke = expenses.filter(e => e.date === date && !e.recurringId && !allowed.has(e.categoryId))
    return { date, broke, state: date > today || date > end ? 'ahead' as const : broke.length ? 'broken' as const : 'ok' as const }
  })
  const broken = days.some(d => d.state === 'broken')
  return { days, state: broken ? 'broken' as const : today > addDays(c.start, 6) && !c.ended ? 'kept' as const : 'running' as const, clean: days.filter(d => d.state === 'ok').length }
}
/** A challenge still in its time: not ended by the customer, and its weeks or its seven days not over yet.
 *  A broken no-spend week stays in view until its last day, so the customer sees what broke it. */
export function isRunning(c: Challenge, today: ISODate = todayISO()) {
  if (c.ended) return false
  return c.kind === '52week' ? !week52(c, today).finished : today <= addDays(c.start, 6)
}
