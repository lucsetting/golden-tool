export type ISODate = string // YYYY-MM-DD
export type MonthKey = string // YYYY-MM

export interface Category {
  id: string
  name: string
  icon: string // lucide icon name, e.g. "Utensils"
  color: string // hex
  budget?: number // optional budget for this category
}

export interface Expense {
  id: string
  amount: number
  categoryId: string
  name: string
  note?: string
  date: ISODate
  recurringId?: string
  createdAt: number
}

export interface Recurring {
  id: string
  amount: number
  categoryId: string
  name: string
  dayOfMonth: number // 1..31, clamped to month length
  active: boolean
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
}
