import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category, Debt, Expense, Goal, Recurring, Settings } from './types'
import { currentMonthKey, daysInMonth, todayISO, uid } from './lib/money'
import { normalizeKey, parseKey, type KeyKind } from './lib/license'

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'groceries', name: 'Groceries', icon: 'ShoppingCart', color: '#3DBE7A' },
  { id: 'dining', name: 'Dining Out', icon: 'Utensils', color: '#F0A33A' },
  { id: 'transport', name: 'Transport', icon: 'Car', color: '#4F8EF7' },
  { id: 'housing', name: 'Housing', icon: 'Home', color: '#A77BF3' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'Zap', color: '#E4B44A' },
  { id: 'health', name: 'Health', icon: 'HeartPulse', color: '#E85D5D' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#F26BA6' },
  { id: 'entertainment', name: 'Entertainment', icon: 'Clapperboard', color: '#2CC3C9' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'Repeat', color: '#7DD3FC' },
  { id: 'personal', name: 'Personal Care', icon: 'Sparkles', color: '#C084FC' },
  { id: 'education', name: 'Education', icon: 'GraduationCap', color: '#86EFAC' },
  { id: 'other', name: 'Other', icon: 'Circle', color: '#8E919A' },
]

export interface State {
  settings: Settings
  categories: Category[]
  expenses: Expense[]
  recurring: Recurring[]
  goals: Goal[]
  debts: Debt[]
  /** month keys for which recurring items were already materialized */
  recurringApplied: string[]

  // settings
  updateSettings: (patch: Partial<Settings>) => void
  /** Validates and stores a code. Returns what it unlocked, or null. */
  activateKey: (key: string) => KeyKind | null
  // expenses
  addExpense: (e: Omit<Expense, 'id' | 'createdAt'>) => Expense
  updateExpense: (id: string, patch: Partial<Omit<Expense, 'id'>>) => void
  deleteExpense: (id: string) => void
  // categories
  addCategory: (c: Omit<Category, 'id'>) => Category
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void
  deleteCategory: (id: string) => void // moves expenses to 'other'
  // recurring
  addRecurring: (r: Omit<Recurring, 'id'>) => Recurring
  updateRecurring: (id: string, patch: Partial<Omit<Recurring, 'id'>>) => void
  deleteRecurring: (id: string) => void
  applyRecurring: (mk?: string) => void // idempotent per month
  // pro
  addGoal: (g: Omit<Goal, 'id'>) => Goal
  updateGoal: (id: string, patch: Partial<Omit<Goal, 'id'>>) => void
  deleteGoal: (id: string) => void
  addDebt: (d: Omit<Debt, 'id'>) => Debt
  updateDebt: (id: string, patch: Partial<Omit<Debt, 'id'>>) => void
  deleteDebt: (id: string) => void
  // data
  exportJSON: () => string
  importJSON: (json: string) => boolean
  resetAll: () => void
}

const initialSettings: Settings = { currency: 'USD', monthlyLimit: 0, onboarded: false, theme: 'light', monthStartDay: 1, keys: [] }

const initialData = () => ({
  settings: initialSettings,
  categories: DEFAULT_CATEGORIES,
  expenses: [] as Expense[],
  recurring: [] as Recurring[],
  goals: [] as Goal[],
  debts: [] as Debt[],
  recurringApplied: [] as string[],
})

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initialData(),

      updateSettings: patch => set(s => {
        const next = { ...s.settings, ...patch }
        if (patch.onboarded && !next.firstOpenedAt) next.firstOpenedAt = Date.now()
        return { settings: next }
      }),
      activateKey: key => {
        const kind = parseKey(key)
        if (!kind) return null
        const k = normalizeKey(key)
        set(s => ({ settings: { ...s.settings, keys: s.settings.keys.includes(k) ? s.settings.keys : [...s.settings.keys, k] } }))
        return kind
      },

      addExpense: e => {
        const exp: Expense = { ...e, id: uid(), createdAt: Date.now() }
        set(s => ({ expenses: [exp, ...s.expenses] }))
        return exp
      },
      updateExpense: (id, patch) => set(s => ({ expenses: s.expenses.map(e => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteExpense: id => set(s => ({ expenses: s.expenses.filter(e => e.id !== id) })),

      addCategory: c => {
        const cat: Category = { ...c, id: uid() }
        set(s => ({ categories: [...s.categories, cat] }))
        return cat
      },
      updateCategory: (id, patch) => set(s => ({ categories: s.categories.map(c => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCategory: id => set(s => ({
        categories: s.categories.filter(c => c.id !== id),
        expenses: s.expenses.map(e => (e.categoryId === id ? { ...e, categoryId: 'other' } : e)),
        recurring: s.recurring.map(r => (r.categoryId === id ? { ...r, categoryId: 'other' } : r)),
      })),

      addRecurring: r => {
        const rec: Recurring = { ...r, id: uid() }
        set(s => ({ recurring: [...s.recurring, rec] }))
        get().applyRecurring()
        return rec
      },
      updateRecurring: (id, patch) => set(s => ({ recurring: s.recurring.map(r => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRecurring: id => set(s => ({ recurring: s.recurring.filter(r => r.id !== id) })),
      applyRecurring: (mk = currentMonthKey()) => {
        const s = get()
        const dim = daysInMonth(mk)
        const today = todayISO()
        const toAdd: Expense[] = []
        for (const r of s.recurring) {
          if (!r.active) continue
          const date = `${mk}-${String(Math.min(r.dayOfMonth, dim)).padStart(2, '0')}`
          if (date > today) continue
          const exists = s.expenses.some(e => e.recurringId === r.id && e.date.slice(0, 7) === mk)
          if (!exists) toAdd.push({ id: uid(), createdAt: Date.now(), amount: r.amount, categoryId: r.categoryId, name: r.name, date, recurringId: r.id })
        }
        if (toAdd.length || !s.recurringApplied.includes(mk)) {
          set(st => ({ expenses: [...toAdd, ...st.expenses], recurringApplied: [...new Set([...st.recurringApplied, mk])] }))
        }
      },

      addGoal: g => { const goal: Goal = { ...g, id: uid() }; set(s => ({ goals: [...s.goals, goal] })); return goal },
      updateGoal: (id, patch) => set(s => ({ goals: s.goals.map(g => (g.id === id ? { ...g, ...patch } : g)) })),
      deleteGoal: id => set(s => ({ goals: s.goals.filter(g => g.id !== id) })),
      addDebt: d => { const debt: Debt = { ...d, id: uid() }; set(s => ({ debts: [...s.debts, debt] })); return debt },
      updateDebt: (id, patch) => set(s => ({ debts: s.debts.map(d => (d.id === id ? { ...d, ...patch } : d)) })),
      deleteDebt: id => set(s => ({ debts: s.debts.filter(d => d.id !== id) })),

      exportJSON: () => {
        const { settings, categories, expenses, recurring, goals, debts, recurringApplied } = get()
        return JSON.stringify({ app: 'golden-tool', version: 1, exportedAt: new Date().toISOString(), settings, categories, expenses, recurring, goals, debts, recurringApplied }, null, 2)
      },
      importJSON: json => {
        try {
          const d = JSON.parse(json)
          if (d?.app !== 'golden-tool' || !Array.isArray(d.expenses)) return false
          set({
            settings: { ...initialSettings, ...d.settings },
            categories: Array.isArray(d.categories) && d.categories.length ? d.categories : DEFAULT_CATEGORIES,
            expenses: d.expenses, recurring: d.recurring ?? [], goals: d.goals ?? [], debts: d.debts ?? [], recurringApplied: d.recurringApplied ?? [],
          })
          return true
        } catch { return false }
      },
      resetAll: () => set(initialData()),
    }),
    {
      name: 'golden-tool',
      version: 2,
      migrate: (persisted, version) => {
        const st = persisted as Partial<State>
        if (version < 2 && st.settings) {
          // v1 (pre-launch) had a single proKey with another checksum; no customers existed, so it is simply dropped.
          st.settings = { ...initialSettings, ...st.settings, keys: st.settings.keys ?? [], firstOpenedAt: st.settings.firstOpenedAt ?? Date.now() }
        }
        return st as State
      },
    },
  ),
)
