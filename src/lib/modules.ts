import type { KeyKind } from './license'

export type ModuleKind = 'debts' | 'goals' | 'reports'

export interface ModuleDef {
  kind: ModuleKind
  name: string
  /** what the add-on is for, in a few words */
  about: string
  /** what it contains, as plain facts: shown on the card of a locked section */
  includes: string[]
  checkoutUrl: string // Digistore24 order form of this upsell (placeholder until launch)
  price: string
}

export const MODULES: Record<ModuleKind, ModuleDef> = {
  debts: {
    kind: 'debts', name: 'Golden Freedom', about: 'Payoff plan, what-if and payments', price: '$47',
    includes: [
      'One payoff plan for all your debts, with the month each one reaches zero and a chart of the balance going down',
      'Snowball and avalanche side by side, with the date and the total interest of each',
      'What-if: try an extra amount per month or a one-off payment, then make it the plan',
      'A payment log that lowers each balance and shows whether you are ahead of or behind the plan',
      'What paying only the minimum costs for each debt, in months and in interest',
      'What the plan pays each month, listed until the last one',
    ],
    checkoutUrl: 'https://www.digistore24.com/product/PLACEHOLDER-DEBTS',
  },
  goals: {
    kind: 'goals', name: 'Golden Goals', about: 'Goals, automatic plan and challenges', price: '$37',
    includes: [
      'Goals with a target, an optional deadline and the amount to set aside per month',
      'A history of contributions for each goal, with a chart of what is saved against the pace for the deadline',
      'Milestones at 25, 50, 75 and 100 percent, with the date reached or expected',
      'An automatic plan that splits what you can save this month over your goals, in your order of priority',
      'Savings challenges: the 52-week challenge and the no-spend week',
      'An emergency fund target from your own essential expenses, for 3 or 6 months',
    ],
    checkoutUrl: 'https://www.digistore24.com/product/PLACEHOLDER-GOALS',
  },
  reports: {
    kind: 'reports', name: 'Golden Vision', about: 'Trends, net worth and yearly report', price: '$27',
    includes: [
      'Trends: twelve months of every category, and a notice when one is far above its usual level',
      'A forecast of where the year ends at your current pace',
      'Net worth: assets and liabilities month by month, with your debts counted for you',
      'Yearly report with the year before beside it and a heatmap of every day',
      'Advanced budgeting: rollover, a 50/30/20 preset and a budgeted against actual report',
      'CSV export of every expense and income, with tags, and a monthly summary as text',
    ],
    checkoutUrl: 'https://www.digistore24.com/product/PLACEHOLDER-REPORTS',
  },
}

/** Money-back window shown in the app. Must match the guarantee set on the Digistore24 products. */
export const REFUND_DAYS = 60
export const DIGISTORE_BUYERS_URL = 'https://www.digistore24.com/en/buyers'
export const DIGISTORE_SUPPORT_EMAIL = 'support@digistore24.com'
export const SUPPORT_EMAIL = 'office@nevian.io' // Nevian Enterprise LLC
export const BUNDLE_CHECKOUT_URL = 'https://www.digistore24.com/product/PLACEHOLDER-BUNDLE'

/** Access included with the front-end product, in days, counted from first use. */
export const ACCESS_DAYS = 365
export const KIND_UNLOCKS: Record<KeyKind, ModuleKind[]> = { all: ['debts', 'goals', 'reports'], debts: ['debts'], goals: ['goals'], reports: ['reports'] }
