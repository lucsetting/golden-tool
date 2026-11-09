import { create } from 'zustand'
import { currentMonthKey } from './lib/money'
import type { ModuleKind } from './lib/modules'

export type Tab =
  | 'home' | 'activity' | 'insights' | 'refund'
  | 'debts' | 'debts-schedule'
  | 'goals' | 'goals-emergency'
  | 'reports' | 'reports-yearly' | 'reports-export'
  | 'settings' | 'settings-categories' | 'settings-recurring' | 'settings-data' | 'settings-billing' | 'settings-refund'
  | 'more'

export type Section = 'dashboard' | ModuleKind | 'settings' | 'more'
export function sectionOf(tab: Tab): Section {
  if (tab.startsWith('settings')) return 'settings'
  if (tab.startsWith('debts')) return 'debts'
  if (tab.startsWith('goals')) return 'goals'
  if (tab.startsWith('reports')) return 'reports'
  if (tab === 'more') return 'more'
  return 'dashboard'
}
export const SECTION_TABS: Record<Section, { tab: Tab; label: string }[]> = {
  dashboard: [{ tab: 'home', label: 'Home' }, { tab: 'activity', label: 'Activity' }, { tab: 'insights', label: 'Insights' }, { tab: 'refund', label: 'Refund' }],
  debts: [{ tab: 'debts', label: 'Planner' }, { tab: 'debts-schedule', label: 'Schedule' }],
  goals: [{ tab: 'goals', label: 'Goals' }, { tab: 'goals-emergency', label: 'Emergency fund' }],
  reports: [{ tab: 'reports', label: 'Budgets' }, { tab: 'reports-yearly', label: 'Yearly report' }, { tab: 'reports-export', label: 'Export' }],
  settings: [{ tab: 'settings', label: 'General' }, { tab: 'settings-categories', label: 'Categories' }, { tab: 'settings-recurring', label: 'Recurring' }, { tab: 'settings-data', label: 'Data' }, { tab: 'settings-billing', label: 'Billing' }, { tab: 'settings-refund', label: 'Refund' }],
  more: [],
}

interface UIState {
  tab: Tab
  setTab: (t: Tab) => void
  /** month being viewed across Home/Activity/Insights */
  month: string
  setMonth: (mk: string) => void
  /** expense sheet (add/edit). editingId undefined = adding */
  sheet: { open: boolean; editingId?: string }
  openSheet: (editingId?: string) => void
  closeSheet: () => void
  /** `action` adds a button to the toast (Undo); the toast then stays up longer. */
  toast?: { msg: string; kind?: 'ok' | 'err'; action?: ToastAction }
  showToast: (msg: string, kind?: 'ok' | 'err', action?: ToastAction) => void
  dismissToast: () => void
}
export interface ToastAction { label: string; run: () => void }
let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useUI = create<UIState>()(set => ({
  tab: 'home',
  setTab: tab => set({ tab }),
  month: currentMonthKey(),
  setMonth: month => set({ month }),
  sheet: { open: false },
  openSheet: editingId => set({ sheet: { open: true, editingId } }),
  closeSheet: () => set({ sheet: { open: false } }),
  showToast: (msg, kind = 'ok', action) => {
    clearTimeout(toastTimer)
    set({ toast: { msg, kind, action } })
    toastTimer = setTimeout(() => set({ toast: undefined }), action ? 6000 : 2400)
  },
  dismissToast: () => { clearTimeout(toastTimer); set({ toast: undefined }) },
}))
