// Bank statement import: everything here is plain data in, plain data out. The file never leaves the browser.
import type { Category, ISODate } from '../types'
import { normName, ruleFor } from './calc'

/** Splits CSV text into rows of fields. Quoted fields may hold the separator, line breaks and doubled quotes. */
export function parseCSV(text: string): string[][] {
  const t = text.replace(/^﻿/, '')
  const head = t.split(/\r?\n/, 1)[0]
  const sep = [',', ';', '\t'].reduce((a, b) => (head.split(b).length > head.split(a).length ? b : a))
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (quoted) {
      if (c !== '"') cell += c
      else if (t[i + 1] === '"') { cell += '"'; i++ }
      else quoted = false
    } else if (c === '"') quoted = true
    else if (c === sep) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.map(r => r.map(c => c.trim())).filter(r => r.some(Boolean))
}

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

/** A statement date as YYYY-MM-DD. Month first unless `dayFirst`; year-first and "Nov 5, 2026" are read as they are. */
export function parseDate(s: string, dayFirst = false): ISODate | null {
  const iso = (y: number, m: number, d: number) => {
    const dt = new Date(y, m - 1, d)
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null
  }
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return iso(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})(?!\d)/)
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]
    return dayFirst ? iso(y, +m[2], +m[1]) : iso(y, +m[1], +m[2])
  }
  if (/[a-z]{3}/i.test(s) && /\d{4}/.test(s)) {
    const d = new Date(Date.parse(s))
    if (!isNaN(d.getTime())) return iso(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }
  return null
}

/** Which column holds what; -1 means not used. Either `amount` (signed) or `debit` and `credit` carry the money. */
export interface Mapping { header: boolean; date: number; name: number; amount: number; debit: number; credit: number }

/** Works out the columns from the header names, and from what the cells look like where the names do not say. */
export function detectColumns(rows: string[][]): Mapping {
  const head = rows[0] ?? []
  const header = !head.some(c => parseDate(c))
  const body = rows.slice(header ? 1 : 0, 12)
  const cols = Array.from({ length: Math.max(0, ...rows.slice(0, 12).map(r => r.length)) }, (_, i) => i)
  const named = (re: RegExp) => (header ? head.findIndex(c => re.test(c)) : -1)
  const share = (i: number, test: (c: string) => boolean) => body.filter(r => test(r[i] ?? '')).length / (body.length || 1)
  const isMoney = (c: string) => c !== '' && !/[a-z]{2}/i.test(c) && !isNaN(parseMoney(c))
  let date = named(/date|posted/i), name = named(/desc|name|payee|merchant|memo|details|narrative/i), amount = named(/amount|amt|value/i)
  let debit = named(/debit|withdraw|money out|paid out/i), credit = named(/credit|deposit|money in|paid in/i)
  if (date < 0) date = cols.find(i => share(i, c => !!parseDate(c)) > 0.6) ?? -1
  if (debit >= 0 && credit >= 0 && debit !== credit) amount = -1
  else {
    debit = credit = -1
    if (amount < 0) amount = cols.find(i => i !== date && share(i, isMoney) > 0.6) ?? -1
  }
  if (name < 0) {
    const text = cols.filter(i => i !== date && share(i, isMoney) <= 0.6)
    const width = (i: number) => body.reduce((n, r) => n + (r[i] ?? '').length, 0)
    name = text.length ? text.reduce((a, b) => (width(b) > width(a) ? b : a)) : -1
  }
  return { header, date, name, amount, debit, credit }
}
/** True when most dates only make sense with the day first (a first number above 12). */
export function guessDayFirst(rows: string[][], m: Mapping): boolean {
  const first = rows.slice(m.header ? 1 : 0).map(r => Number((r[m.date] ?? '').match(/^(\d{1,2})[-/.]\d{1,2}[-/.]/)?.[1]))
  return first.some(n => n > 12)
}
/** True when a signed amount column has no negative value: a card statement, where a positive amount is money out. */
export function guessPositiveOut(rows: string[][], m: Mapping): boolean {
  return m.amount >= 0 && !rows.slice(m.header ? 1 : 0).some(r => parseMoney(r[m.amount] ?? '') < 0)
}

/** One statement line. `amount` is positive for money out and negative for money in. */
export interface StatementRow { line: number; date: ISODate; name: string; amount: number }
/** The statement lines that have a date and an amount. In a signed column money out is negative, unless `positiveOut`. */
export function toRows(rows: string[][], m: Mapping, dayFirst = false, positiveOut = false): StatementRow[] {
  const out: StatementRow[] = []
  rows.slice(m.header ? 1 : 0).forEach((r, line) => {
    const date = parseDate(r[m.date] ?? '', dayFirst)
    let amount: number
    if (m.amount >= 0) amount = parseMoney(r[m.amount] ?? '') * (positiveOut ? 1 : -1)
    else {
      const d = parseMoney(r[m.debit] ?? ''), c = parseMoney(r[m.credit] ?? '')
      amount = isNaN(d) && isNaN(c) ? NaN : Math.abs(d || 0) - Math.abs(c || 0)
    }
    if (date && amount) out.push({ line, date, name: (r[m.name] ?? '').replace(/\s+/g, ' ').trim(), amount: Math.round(amount * 100) / 100 })
  })
  return out
}

/** Same date, same amount and same name once normalised: the record is already here. */
export const rowKey = (date: string, amount: number, name: string) => `${date}|${Math.round(Math.abs(amount) * 100)}|${normName(name)}`

// ponytail: a short fixed word list for the built-in categories; category rules cover everything the customer corrects once.
const KEYWORDS: [RegExp, string][] = [
  [/\b(netflix|spotify|hulu|disney|youtube|icloud|prime video|subscription)\b/, 'subscriptions'],
  [/\b(restaurant|cafe|coffee|starbucks|mcdonalds|chipotle|pizza|doordash|uber eats|grubhub|burger|taco|sushi|diner)\b/, 'dining'],
  [/\b(safeway|kroger|whole foods|trader joes|costco|aldi|walmart|publix|grocery|groceries|supermarket)\b/, 'groceries'],
  [/\b(uber|lyft|shell|chevron|exxon|gas|fuel|parking|transit|metro|toll)\b/, 'transport'],
  [/\b(rent|mortgage|landlord|hoa)\b/, 'housing'],
  [/\b(electric|water|utility|utilities|internet|comcast|verizon|at t|t mobile|phone|energy)\b/, 'bills'],
  [/\b(pharmacy|cvs|walgreens|doctor|dental|dentist|clinic|hospital|gym|fitness)\b/, 'health'],
  [/\b(amazon|target|ebay|etsy|best buy|ikea)\b/, 'shopping'],
  [/\b(cinema|movie|movies|theater|concert|ticketmaster|steam|playstation|xbox)\b/, 'entertainment'],
  [/\b(salon|barber|spa|haircut)\b/, 'personal'],
  [/\b(tuition|udemy|coursera|school|university|bookstore)\b/, 'education'],
]
/** The category for a statement line: the customer's own rules first, then the built-in words, then Other. */
export function categorise(name: string, rules: Record<string, string>, categories: Category[]): string {
  const usable = (id?: string) => !!id && categories.some(c => c.id === id && !c.hidden)
  const rule = ruleFor(rules, name)
  if (usable(rule)) return rule!
  const n = normName(name)
  return KEYWORDS.find(([re, id]) => re.test(n) && usable(id))?.[1] ?? 'other'
}
