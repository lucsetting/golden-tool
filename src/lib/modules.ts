import type { KeyKind } from './license'

export type ModuleKind = 'debts' | 'goals' | 'reports'

export interface ModuleDef {
  kind: ModuleKind
  name: string
  short: string
  tagline: string
  benefits: { title: string; text: string }[]
  checkoutUrl: string // Digistore24 order form of this upsell (placeholder until launch)
  price: string
}

export const MODULES: Record<ModuleKind, ModuleDef> = {
  debts: {
    kind: 'debts', name: 'Debt Payoff Planner', short: 'Debts', price: '$47',
    tagline: 'See the exact month you become debt-free, and how much interest you skip.',
    benefits: [
      { title: 'Your debt-free date', text: 'Every card and loan in one plan, with the month it hits zero.' },
      { title: 'Snowball or avalanche', text: 'Pick the method that fits you and see the difference in dollars.' },
      { title: 'Interest you avoid', text: 'Add any extra amount per month and watch the interest drop.' },
      { title: 'Month-by-month schedule', text: 'A payment calendar you can follow without a spreadsheet.' },
    ],
    checkoutUrl: 'https://www.digistore24.com/product/PLACEHOLDER-DEBTS',
  },
  goals: {
    kind: 'goals', name: 'Savings Goals', short: 'Goals', price: '$37',
    tagline: 'Turn what you want into a number per month, based on how you actually spend.',
    benefits: [
      { title: 'Goals with a deadline', text: 'Vacation, car, cushion: each one tells you what to set aside monthly.' },
      { title: 'Emergency fund target', text: 'Calculated from your real essential spending, not a generic rule.' },
      { title: 'Safe to save', text: 'How much you can move to savings this month without going over your limit.' },
      { title: 'Progress you can feel', text: 'Add money in one tap and watch the bar move.' },
    ],
    checkoutUrl: 'https://www.digistore24.com/product/PLACEHOLDER-GOALS',
  },
  reports: {
    kind: 'reports', name: 'Reports & Budgets', short: 'Reports', price: '$27',
    tagline: 'Caps per category, a yearly view and your data in a spreadsheet when you want it.',
    benefits: [
      { title: 'Category budgets', text: 'A cap for groceries, dining, shopping. The bar turns red before you overspend.' },
      { title: 'Yearly report', text: 'Twelve months side by side, with the total and the monthly average.' },
      { title: 'CSV export', text: 'Every expense, ready for Excel, Google Sheets or your accountant.' },
      { title: 'Monthly summary', text: 'What changed versus last month, in plain English.' },
    ],
    checkoutUrl: 'https://www.digistore24.com/product/PLACEHOLDER-REPORTS',
  },
}

export const LIFETIME = {
  name: 'Lifetime Access', price: '$17',
  checkoutUrl: 'https://www.digistore24.com/product/PLACEHOLDER-LIFETIME',
}
/** Money-back window shown in the app. Must match the guarantee set on the Digistore24 products. */
export const REFUND_DAYS = 30
export const DIGISTORE_BUYERS_URL = 'https://www.digistore24.com/en/buyers'
export const DIGISTORE_SUPPORT_EMAIL = 'support@digistore24.com'
export const SUPPORT_EMAIL = 'support@PLACEHOLDER.com' // owner's own support address
export const BUNDLE_CHECKOUT_URL = 'https://www.digistore24.com/product/PLACEHOLDER-BUNDLE'

/** Access included with the front-end product, in days, counted from first use. */
export const ACCESS_DAYS = 365
export const KIND_UNLOCKS: Record<KeyKind, ModuleKind[]> = { all: ['debts', 'goals', 'reports'], debts: ['debts'], goals: ['goals'], reports: ['reports'], lifetime: [] }
