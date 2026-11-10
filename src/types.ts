export type ISODate = string // YYYY-MM-DD
export type MonthKey = string // YYYY-MM

export interface Category {
  id: string
  name: string
  icon: string // lucide icon name, e.g. "Utensils"
  color: string // hex
  budget?: number // optional budget for this category
  hidden?: boolean // left out of the pickers; what was filed under it stays
  rollover?: MonthKey // Golden Vision: the month rollover was switched on; from the month after, what the budget left unused is carried over
  group?: 'needs' | 'wants' // for the 50/30/20 preset; unset follows the built-in default
}

export interface Expense {
  id: string
  amount: number
  categoryId: string
  name: string
  note?: string
  date: ISODate
  recurringId?: string
  tags?: string[]
  importId?: string // the statement import that created it, so the import can be undone as a whole
  createdAt: number
}

/** A bill. The list keeps its first name, `recurring`, in stored and synced state. */
export interface Recurring {
  id: string
  amount: number
  categoryId: string
  name: string
  dayOfMonth: number // 1..31, clamped to month length
  active: boolean // false = paused
  subscription?: boolean
}

export interface Income {
  id: string
  amount: number
  source: string
  date: ISODate
  repeat?: boolean // posts again on the same day of every later month
  repeatOf?: string // the repeating income this one was posted from
  importId?: string
  createdAt: number
}

/** A goal. The order of the goal list is the priority. What is saved is the sum of its contributions. */
export interface Goal {
  id: string
  name: string
  target: number
  deadline?: ISODate
  color: string
}
export interface Contribution {
  id: string
  goalId: string
  amount: number // negative when the customer took money back out
  date: ISODate
  /** where it came from when the customer did not type it: saved before contributions existed, the automatic plan, a challenge step */
  source?: 'opening' | 'plan' | 'challenge'
}
/** `done` holds the completed weeks of a 52-week challenge. A no-spend week is checked from the expenses. */
export interface Challenge {
  id: string
  kind: '52week' | 'nospend'
  start: ISODate
  goalId?: string // 52-week: the goal that receives each week's amount
  base?: number // 52-week: week n asks for n times this
  essentials?: string[] // no-spend week: the categories still allowed
  done: number[]
  ended?: ISODate // ended early by the customer
}

export interface Debt {
  id: string
  name: string
  /** What was owed on `startDate`. What is owed today comes from `owed()`: interest added, payments taken off. */
  balance: number
  startDate?: ISODate
  apr: number // percent, e.g. 24.99
  minPayment: number
}
export interface Payment {
  id: string
  debtId: string
  amount: number
  date: ISODate
  correction?: boolean // the customer set the balance to match a statement; negative when the balance went up
}
export interface DebtPlan {
  method: 'snowball' | 'avalanche'
  extra: number // on top of the minimum payments, every month
  oneOff?: { amount: number; month: MonthKey }
  start?: ISODate // the day these settings were last changed: ahead or behind is counted from here
}

/** An asset or a liability in net worth. */
export interface Holding {
  id: string
  name: string
  kind: string
  value: number
}
export interface NetWorthSnapshot { month: MonthKey; assets: number; liabilities: number }

export type Theme = 'dark' | 'light' | 'system'

export interface Settings {
  currency: string // ISO 4217
  monthlyLimit: number
  onboarded: boolean
  theme: Theme
  /** @deprecated migrated into keys */
  proKey?: string
  /** activation codes entered (normalized, 12 chars) */
  keys: string[]
  /** first time the app was set up; included access counts from here */
  firstOpenedAt?: number
  monthStartDay: number // 1 = calendar month
  longestStreak?: number // days; the current streak is worked out from the expenses
}
