import { useCallback, useMemo } from 'react'
import { useStore } from '../../store'
import { hasModule } from '../../lib/access'
import { carriedInto } from '../../lib/vision'
import { monthKey, shiftMonth } from '../../lib/money'
import type { Category } from '../../types'

/** What each budget carries into `month` from the month before: always 0 without Golden Vision.
 *  One place for it, so Home and Budgets judge a budget the same way. */
export function useCarried(month: string) {
  const expenses = useStore(s => s.expenses)
  const vision = useStore(s => hasModule(s.settings, 'reports'))
  const spentLast = useMemo(() => {
    const last = shiftMonth(month, -1), spent = new Map<string, number>()
    for (const e of expenses) if (monthKey(e.date) === last) spent.set(e.categoryId, (spent.get(e.categoryId) ?? 0) + e.amount)
    return spent
  }, [expenses, month])
  return useCallback((c: Category) => (vision ? carriedInto(c, month, spentLast.get(c.id) ?? 0) : 0), [vision, month, spentLast])
}
