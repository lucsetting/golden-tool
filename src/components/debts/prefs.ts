import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DebtPrefs {
  extra: number
  method: 'snowball' | 'avalanche'
  setExtra: (n: number) => void
  setMethod: (m: 'snowball' | 'avalanche') => void
}
export const useDebtPrefs = create<DebtPrefs>()(persist(
  set => ({ extra: 0, method: 'avalanche', setExtra: extra => set({ extra }), setMethod: method => set({ method }) }),
  { name: 'golden-tool:debt-prefs' },
))
