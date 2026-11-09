import { useMemo, useState } from 'react'
import { PlusIcon, TrashIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { fmt } from '../lib/money'
import { deleteWithUndo } from '../lib/undo'
import { parseAmount } from './ExpenseSheet'
import { Button, Card, CardHeader, CategoryBadge, Dialog, Empty, Field, IconButton, Input, Select, Switch, TableRow, cx } from './ui'
import type { Recurring } from '../types'

function EditDialog({ r, onClose }: { r: Recurring; onClose: () => void }) {
  const categories = useStore(s => s.categories)
  const [amount, setAmount] = useState(String(r.amount))
  const [name, setName] = useState(r.name)
  const [cat, setCat] = useState(r.categoryId)
  const [day, setDay] = useState(String(r.dayOfMonth))
  const [tried, setTried] = useState(false)
  const errs = {
    amount: parseAmount(amount) > 0 ? undefined : 'Enter an amount greater than 0',
    name: name.trim() ? undefined : 'Enter a name',
    day: Number(day) >= 1 && Number(day) <= 31 ? undefined : 'Day must be 1 to 31',
  }
  const save = () => {
    setTried(true)
    if (errs.amount || errs.name || errs.day) return
    useStore.getState().updateRecurring(r.id, { amount: parseAmount(amount), name: name.trim(), categoryId: cat, dayOfMonth: Math.round(Number(day)) })
    onClose()
  }
  return (
    <Dialog open onClose={onClose} title="Edit bill" description="Added as an expense on this day every month.">
      <form className="flex flex-col gap-5" onSubmit={e => { e.preventDefault(); save() }}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount" error={tried ? errs.amount : undefined}><Input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} autoFocus /></Field>
          <Field label="Day of month" error={tried ? errs.day : undefined}><Input type="number" inputMode="numeric" min={1} max={31} value={day} onChange={e => setDay(e.target.value)} /></Field>
        </div>
        <Field label="Name" error={tried ? errs.name : undefined}><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Category"><Select value={cat} onChange={e => setCat(e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" className="max-sm:flex-1">Save</Button>
        </div>
      </form>
    </Dialog>
  )
}

/** The bills that repeat every month. Tap a row to edit it; the switch pauses it; removing it can be undone from the toast. */
export default function RecurringManager() {
  const recurring = useStore(s => s.recurring)
  const categories = useStore(s => s.categories)
  const currency = useStore(s => s.settings.currency)
  const [editing, setEditing] = useState<string>()
  const monthly = useMemo(() => recurring.reduce((sum, r) => sum + (r.active ? r.amount : 0), 0), [recurring])
  const editRow = recurring.find(r => r.id === editing)
  return (
    <Card>
      <CardHeader title="Bills" right={recurring.length > 0 && <span className="text-sm text-muted-foreground tabular-nums">{fmt(monthly, currency)} a month</span>} />
      {recurring.length === 0
        ? <Empty title="No bills yet" text='Turn on "Repeat monthly" when you add an expense and it is added again every month.'
            action={<Button onClick={() => useUI.getState().openSheet()}><PlusIcon /><span>Add expense</span></Button>} />
        : recurring.map(r => {
          const cat = categories.find(c => c.id === r.categoryId) ?? { icon: 'Circle', color: '#8E919A', name: 'Other' }
          return (
            <TableRow key={r.id} className="pr-2 gap-1">
              <button type="button" onClick={() => setEditing(r.id)}
                className={cx('t flex-1 min-w-0 self-stretch -ml-4 -my-2.5 pl-4 pr-2 py-2.5 flex items-center gap-3 text-left hover:bg-muted/50 focus-visible:outline-offset-[-2px]', !r.active && 'opacity-50')}>
                <CategoryBadge category={cat} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="sr-only">Edit </span>
                  <span className="block text-foreground truncate">{r.name}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5 truncate">Day {r.dayOfMonth}<span className="max-sm:hidden"> · {cat.name}</span></span>
                </span>
                <span className="text-foreground tabular-nums">{fmt(r.amount, currency)}</span>
              </button>
              {/* The label widens the switch's tap area to 44px. */}
              <label className="h-11 w-11 shrink-0 inline-flex items-center justify-center cursor-pointer">
                <Switch checked={r.active} onChange={v => useStore.getState().updateRecurring(r.id, { active: v })} label={`${r.name} active`} />
              </label>
              <IconButton label={`Remove ${r.name}`} className="shrink-0" onClick={() => deleteWithUndo('recurring', r.id, 'Removed')}><TrashIcon /></IconButton>
            </TableRow>
          )
        })}
      {editRow && <EditDialog key={editRow.id} r={editRow} onClose={() => setEditing(undefined)} />}
    </Card>
  )
}
