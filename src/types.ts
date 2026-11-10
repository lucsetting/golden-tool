export type ISODate = string // YYYY-MM-DD
export type MonthKey = string // YYYY-MM

export interface Category {
  id: string
  name: string
  icon: string // lucide icon name, e.g. "Utensils"
  color: string // hex
  budget?: number // optional budget for this category
  hidden?: boolean // left out of the pickers; what was filed under it stays
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

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  deadline?: ISODate
  color: string
}

export interface Debt {
  id: string
  name: string
  balance: number
  apr: number // percent, e.g. 24.99
  minPayment: number
}

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
