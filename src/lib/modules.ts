import type { KeyKind } from './license'

export type ModuleKind = 'debts' | 'goals' | 'reports'

export interface ModuleDef {
  kind: ModuleKind
  name: string
  short: string
  benefits: { title: string; text: string }[]
  checkoutUrl: string // Digistore24 order form of this upsell (placeholder until launch)
  price: string
}

export const MODULES: Record<ModuleKind, ModuleDef> = {
  debts: {
    kind: 'debts', name: 'Golden Freedom', short: 'Debts', price: '$47',
    benefits: [
      { title: 'Your debt-free date', text: 'Every card and loan in one plan, with the month it hits zero.' },
      { title: 'Snowball or avalanche', text: 'Pick the method that fits you and see the difference in dollars.' },
      { title: 'Interest you avoid', text: 'Add any extra amount per month and watch the interest drop.' },
      { title: 'Month-by-month schedule', text: 'A payment calendar you can follow without a spreadsheet.' },
    ],
    checkoutUrl: 'https://www.digistore24.com/product/PLACEHOLDER-DEBTS',
  },
  goals: {
    kind: 'goals', name: 'Golden Goals', short: 'Goals', price: '$37',
    benefits: [
      { title: 'Goals with a deadline', text: 'Vacation, car, cushion: each one tells you what to set aside monthly.' },
      { title: 'Emergency fund target', text: 'Calculated from your real essential spending, not a generic rule.' },
      { title: 'Safe to save', text: 'How much you can move to savings this month without going over your limit.' },
      { title: 'Progress you can feel', text: 'Add money in one tap and watch the bar move.' },
    ],
    checkoutUrl: 'https://www.digistore24.com/product/PLACEHOLDER-GOALS',
  },
  reports: {
    kind: 'reports', name: 'Golden Vision', short: 'Reports', price: '$27',
    benefits: [
      { title: 'Yearly report', text: 'Twelve months side by side, with the total and the monthly average.' },
      { title: 'CSV export', text: 'Every expense and income, ready for Excel, Google Sheets or your accountant.' },
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
export const REFUND_DAYS = 60
export const DIGISTORE_BUYERS_URL = 'https://www.digistore24.com/en/buyers'
export const DIGISTORE_SUPPORT_EMAIL = 'support@digistore24.com'
export const SUPPORT_EMAIL = 'office@nevian.io' // Nevian Enterprise LLC
export const BUNDLE_CHECKOUT_URL = 'https://www.digistore24.com/product/PLACEHOLDER-BUNDLE'

/** Access included with the front-end product, in days, counted from first use. */
export const ACCESS_DAYS = 365
export const KIND_UNLOCKS: Record<KeyKind, ModuleKind[]> = { all: ['debts', 'goals', 'reports'], debts: ['debts'], goals: ['goals'], reports: ['reports'], lifetime: [] }
