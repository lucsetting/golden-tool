import { create, type StateCreator, type StoreMutatorIdentifier } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category, Challenge, Contribution, Debt, DebtPlan, Expense, Goal, Holding, Income, NetWorthSnapshot, Payment, Recurring, Settings } from './types'
import { monthKey, todayISO, uid } from './lib/money'
import { normName, postings } from './lib/calc'
import { debtsNow } from './lib/debts'
import { netWorth } from './lib/vision'
import { normalizeKey, parseKey, type KeyKind } from './lib/license'
import { isReadOnly } from './lib/access'
import { useUI } from './ui-state'

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
/** Categories that ship with the app: they can be renamed and hidden, never deleted, so their ids stay. */
export const isBuiltIn = (id: string) => DEFAULT_CATEGORIES.some(c => c.id === id)

/** Everything the customer owns: stored in the browser, synced to the account, written to a backup. */
export interface Data {
  settings: Settings
  categories: Category[]
  expenses: Expense[]
  /** bills */
  recurring: Recurring[]
  goals: Goal[]
  debts: Debt[]
  /** months already swept for bills and repeating income, plus one key per posting; see `postings` */
  recurringApplied: string[]
  incomes: Income[]
  /** category rules: normalised merchant name -> category id */
  rules: Record<string, string>
  /** what the customer actually paid toward each debt, and balance corrections */
  payments: Payment[]
  /** the payoff plan's settings */
  plan: DebtPlan
  contributions: Contribution[]
  challenges: Challenge[]
  assets: Holding[]
  liabilities: Holding[]
  /** net worth, one snapshot per month in which a value changed */
  netWorth: NetWorthSnapshot[]
}
export const DATA_KEYS = ['settings', 'categories', 'expenses', 'recurring', 'goals', 'debts', 'recurringApplied', 'incomes', 'rules', 'payments', 'plan', 'contributions', 'challenges', 'assets', 'liabilities', 'netWorth'] as const satisfies readonly (keyof Data)[]
/** The lists whose items carry an id and are added and edited the same way. */
export type ListKey = 'goals' | 'debts' | 'payments' | 'contributions' | 'challenges' | 'assets' | 'liabilities'
export const pickData = (s: Data): Data => Object.fromEntries(DATA_KEYS.map(k => [k, s[k]])) as unknown as Data

export interface State extends Data {
  // settings
  updateSettings: (patch: Partial<Settings>) => void
  /** Validates and stores a code. Returns what it unlocked, or null. */
  activateKey: (key: string) => KeyKind | null
  // expenses
  addExpense: (e: Omit<Expense, 'id' | 'createdAt'>) => Expense
  updateExpense: (id: string, patch: Partial<Omit<Expense, 'id'>>) => void
  /** Remembers the category chosen for a merchant name; the latest choice wins. */
  learnRule: (name: string, categoryId: string) => void
  // income
  addIncome: (i: Omit<Income, 'id' | 'createdAt'>) => Income
  updateIncome: (id: string, patch: Partial<Omit<Income, 'id'>>) => void
  // categories
  addCategory: (c: Omit<Category, 'id'>) => Category
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id'>>) => void
  /** Deletes a category and moves its expenses and bills to `to`. */
  deleteCategory: (id: string, to?: string) => void
  // bills
  addRecurring: (r: Omit<Recurring, 'id'>) => Recurring
  updateRecurring: (id: string, patch: Partial<Omit<Recurring, 'id'>>) => void
  /** Posts the bills and repeating income that have come due. Safe to call any number of times. */
  applyRecurring: () => void
  // add-ons
  addTo: <K extends ListKey>(key: K, item: Omit<Data[K][number], 'id'>) => Data[K][number]
  patchIn: <K extends ListKey>(key: K, id: string, patch: Partial<Omit<Data[K][number], 'id'>>) => void
  setPlan: (patch: Partial<DebtPlan>) => void
  /** Moves a goal one place up (-1) or down (1) in the priority order. */
  moveGoal: (id: string, by: -1 | 1) => void
  // data
  exportJSON: () => string
  importJSON: (json: string) => boolean
  resetAll: () => void
}

const initialSettings: Settings = { currency: 'USD', monthlyLimit: 0, onboarded: false, theme: 'light', monthStartDay: 1, keys: [] }
const initialPlan: DebtPlan = { method: 'avalanche', extra: 0 }
const initialData = (): Data => ({
  settings: initialSettings, categories: DEFAULT_CATEGORIES, expenses: [], recurring: [], goals: [], debts: [], recurringApplied: [], incomes: [], rules: {},
  payments: [], plan: initialPlan, contributions: [], challenges: [], assets: [], liabilities: [], netWorth: [],
})
/** Before version 4 the strategy and the extra amount lived in this browser only. */
function legacyPlan(): DebtPlan {
  try {
    const p = JSON.parse(localStorage.getItem('golden-tool:debt-prefs') ?? '{}').state
    return { method: p.method === 'snowball' ? 'snowball' : 'avalanche', extra: Number(p.extra) > 0 ? Number(p.extra) : 0 }
  } catch { return initialPlan }
}

/** Brings stored, synced or imported state to the current shape: every list present, defaults under the settings,
 *  and nothing it carries removed (fields written by a newer version stay). Running it twice changes nothing.
 *  Version 4: a goal's `saved` number becomes contributions (whatever the contributions do not already explain, so a
 *  device still on version 3 cannot make it count twice), and a debt gets the day its balance was true. */
export function migrate(raw: unknown): Data {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Data>
  const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])
  const today = todayISO()
  const contributions = [...list(r.contributions)]
  const goals = list(r.goals as (Goal & { saved?: number })[]).map(({ saved, ...g }) => {
    const missing = Math.round(((Number(saved) || 0) - contributions.filter(c => c.goalId === g.id).reduce((s, c) => s + c.amount, 0)) * 100) / 100
    if (typeof saved === 'number' && missing) contributions.push({ id: uid(), goalId: g.id, amount: missing, date: today, source: 'opening' })
    return g
  })
  return {
    ...r,
    settings: { ...initialSettings, ...r.settings, keys: list(r.settings?.keys) },
    categories: list(r.categories).length ? r.categories! : DEFAULT_CATEGORIES,
    expenses: list(r.expenses), recurring: list(r.recurring), goals, contributions,
    debts: list(r.debts).map(d => (d.startDate ? d : { ...d, startDate: today })),
    recurringApplied: list(r.recurringApplied), incomes: list(r.incomes),
    rules: r.rules && typeof r.rules === 'object' ? r.rules : {},
    payments: list(r.payments), plan: { ...(r.plan ?? legacyPlan()) }, challenges: list(r.challenges),
    assets: list(r.assets), liabilities: list(r.liabilities), netWorth: list(r.netWorth),
  }
}

let loading = false
/** Replaces data from outside the customer's own actions (the account's copy, erase). Works after included access ended. */
export function loadState(d: Partial<Data>) {
  loading = true
  try { useStore.setState(d) } finally { loading = false }
}
/** What still saves once included access ended: how the app looks, a code that lifts the block, and the streak record the app keeps itself. */
const OPEN_SETTINGS = ['theme', 'keys', 'longestStreak']
/** The one read-only guard: once included access ended, nothing the customer entered can change. */
const guard = <M extends [StoreMutatorIdentifier, unknown][]>(f: StateCreator<State, [], M>) => ((set, get, api) => {
  const guarded = ((partial, replace) => {
    const next = typeof partial === 'function' ? partial(get()) : partial
    const now = get()
    if (!loading && now && isReadOnly(now.settings)) {
      const settings = { ...now.settings, ...(next as Partial<State>).settings } as Record<string, unknown>
      const closed = Object.keys(settings).some(k => settings[k] !== (now.settings as unknown as Record<string, unknown>)[k] && !OPEN_SETTINGS.includes(k))
      if (closed || Object.keys(next).some(k => k !== 'settings')) return useUI.getState().refuse()
    }
    set(next as State, replace as false)
  }) as typeof set
  api.setState = guarded
  return f(guarded, get, api)
}) as StateCreator<State, [], M>

export const useStore = create<State>()(
  guard(persist(
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
      learnRule: (name, categoryId) => {
        const n = normName(name)
        if (n && get().rules[n] !== categoryId) set(s => ({ rules: { ...s.rules, [n]: categoryId } }))
      },

      addIncome: i => {
        const inc: Income = { ...i, id: uid(), createdAt: Date.now() }
        set(s => ({ incomes: [inc, ...s.incomes] }))
        get().applyRecurring()
        return inc
      },
      updateIncome: (id, patch) => set(s => ({ incomes: s.incomes.map(i => (i.id === id ? { ...i, ...patch } : i)) })),

      addCategory: c => {
        const cat: Category = { ...c, id: uid() }
        set(s => ({ categories: [...s.categories, cat] }))
        return cat
      },
      updateCategory: (id, patch) => set(s => ({ categories: s.categories.map(c => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCategory: (id, to = 'other') => set(s => ({
        categories: s.categories.filter(c => c.id !== id),
        expenses: s.expenses.map(e => (e.categoryId === id ? { ...e, categoryId: to } : e)),
        recurring: s.recurring.map(r => (r.categoryId === id ? { ...r, categoryId: to } : r)),
        rules: Object.fromEntries(Object.entries(s.rules).filter(([, c]) => c !== id)),
      })),

      addRecurring: r => {
        const rec: Recurring = { ...r, id: uid() }
        set(s => ({ recurring: [...s.recurring, rec] }))
        get().applyRecurring()
        return rec
      },
      updateRecurring: (id, patch) => set(s => ({ recurring: s.recurring.map(r => (r.id === id ? { ...r, ...patch } : r)) })),
      applyRecurring: () => {
        const due = postings(get(), todayISO())
        if (!due.applied.length) return
        const stamp = <T,>(x: T) => ({ ...x, id: uid(), createdAt: Date.now() })
        set(s => ({
          expenses: [...due.expenses.map(stamp), ...s.expenses],
          incomes: [...due.incomes.map(stamp), ...s.incomes],
          recurringApplied: [...s.recurringApplied, ...due.applied],
        }))
      },

      addTo: (key, item) => {
        const added = { ...item, id: uid() } as Data[typeof key][number]
        set(s => ({ [key]: [...s[key], added] }))
        return added
      },
      patchIn: (key, id, patch) => set(s => ({ [key]: (s[key] as { id: string }[]).map(x => (x.id === id ? { ...x, ...patch } : x)) })),
      setPlan: patch => set(s => ({ plan: { ...s.plan, ...patch } })),
      moveGoal: (id, by) => set(s => {
        const i = s.goals.findIndex(g => g.id === id), j = i + by, goals = [...s.goals]
        if (i < 0 || j < 0 || j >= goals.length) return {}
        ;[goals[i], goals[j]] = [goals[j], goals[i]]
        return { goals }
      }),

      exportJSON: () => JSON.stringify({ app: 'golden-tool', version: 4, exportedAt: new Date().toISOString(), ...pickData(get()) }, null, 2),
      importJSON: json => {
        try {
          const d = JSON.parse(json)
          if (d?.app !== 'golden-tool' || !Array.isArray(d.expenses)) return false
          set(pickData(migrate(d)))
          return true
        } catch { return false }
      },
      // Erasing keeps the codes and the day the included access started: the data goes, the purchase stays.
      resetAll: () => loadState({ ...initialData(), settings: { ...initialSettings, keys: get().settings.keys, firstOpenedAt: get().settings.firstOpenedAt } }),
    }),
    {
      name: 'golden-tool',
      version: 4,
      migrate: (persisted, version) => {
        const st = persisted as Partial<Data>
        if (version < 2 && st.settings) {
          // v1 (pre-launch) had a single proKey with another checksum; no customers existed, so it is simply dropped.
          st.settings = { ...initialSettings, ...st.settings, keys: st.settings.keys ?? [], firstOpenedAt: st.settings.firstOpenedAt ?? Date.now() }
        }
        return migrate(st) as State // v3 and v4: new lists arrive empty; see `migrate` for what happens to goals and debts
      },
    },
  )),
)

// Net worth keeps one snapshot per month, rewritten whenever a value behind it changes. Nothing is kept for a customer who lists no asset or liability.
useStore.subscribe((s, prev) => {
  if (s.assets === prev.assets && s.liabilities === prev.liabilities && s.debts === prev.debts && s.payments === prev.payments) return
  if (isReadOnly(s.settings) || (!s.assets.length && !s.liabilities.length && !s.netWorth.length)) return
  const month = monthKey(todayISO()), now = netWorth(s.assets, s.liabilities, debtsNow(s.debts, s.payments))
  const old = s.netWorth.find(n => n.month === month)
  if (old?.assets === now.assets && old.liabilities === now.liabilities) return
  useStore.setState({ netWorth: [...s.netWorth.filter(n => n.month !== month), { month, assets: now.assets, liabilities: now.liabilities }] })
})
