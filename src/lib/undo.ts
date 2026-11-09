import { useStore } from '../store'
import { useUI } from '../ui-state'

type ListKey = 'expenses' | 'recurring' | 'goals' | 'debts'

/** Removes one item and shows a toast whose Undo puts it back exactly where it was. */
export function deleteWithUndo(key: ListKey, id: string, msg = 'Deleted') {
  const list = useStore.getState()[key] as { id: string }[]
  const index = list.findIndex(x => x.id === id)
  if (index < 0) return
  const item = list[index]
  useStore.setState({ [key]: list.filter(x => x.id !== id) })
  useUI.getState().showToast(msg, 'ok', {
    label: 'Undo',
    run: () => useStore.setState(s => {
      const now = s[key] as { id: string }[]
      if (now.some(x => x.id === id)) return {}
      return { [key]: [...now.slice(0, index), item, ...now.slice(index)] }
    }),
  })
}
