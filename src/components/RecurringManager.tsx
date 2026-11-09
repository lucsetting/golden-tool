import { useState } from 'react'
import { PencilIcon, TrashIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { fmt } from '../lib/money'
import { parseAmount } from './ExpenseSheet'
import { Button, Card, CardHeader, CategoryBadge, Dialog, Empty, Field, IconButton, Input, Select, Switch, cx } from './ui'
import type { Recurring } from '../types'

function EditDialog({ r, onClose }: { r: Recurring; onClose: () => void }) {
  const { categories, updateRecurring } = useStore()
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
    updateRecurring(r.id, { amount: parseAmount(amount), name: name.trim(), categoryId: cat, dayOfMonth: Math.round(Number(day)) })
    onClose()
  }
  return (
    <Dialog open onClose={onClose} title="Edit recurring" description="Added automatically on this day every month.">
      <form className="flex flex-col gap-5" onSubmit={e => { e.preventDefault(); save() }}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount" error={tried ? errs.amount : undefined}><Input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} autoFocus /></Field>
          <Field label="Day of month" error={tried ? errs.day : undefined}><Input type="number" min={1} max={31} value={day} onChange={e => setDay(e.target.value)} /></Field>
        </div>
        <Field label="Name" error={tried ? errs.name : undefined}><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Category"><Select value={cat} onChange={e => setCat(e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save</Button>
        </div>
      </form>
    </Dialog>
  )
}

export default function RecurringManager() {
  const { recurring, categories, settings, updateRecurring, deleteRecurring } = useStore()
  const showToast = useUI(s => s.showToast)
  const [editing, setEditing] = useState<string>()
  const [delId, setDelId] = useState<string>()
  const editRow = recurring.find(r => r.id === editing)
  return (
    <Card>
      <CardHeader title="Recurring" />
      {recurring.length === 0
        ? <Empty text='Turn on "Repeat monthly" when adding an expense (rent, subscriptions...).' />
        : recurring.map(r => {
          const cat = categories.find(c => c.id === r.categoryId) ?? { icon: 'Circle', color: '#8E919A', name: 'Other' }
          return (
            <div key={r.id} className="h-16 px-4 flex items-center gap-3 border-b border-border last:border-b-0">
              <CategoryBadge category={cat} size={32} className={cx(!r.active && 'opacity-50')} />
              <div className={cx('min-w-0 flex-1', !r.active && 'opacity-50')}>
                <div className="text-sm text-foreground truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">Day {r.dayOfMonth} · {cat.name}</div>
              </div>
              <span className={cx('text-sm text-foreground tabular-nums', !r.active && 'opacity-50')}>{fmt(r.amount, settings.currency)}</span>
              <Switch checked={r.active} onChange={v => updateRecurring(r.id, { active: v })} label={`${r.name} active`} />
              <IconButton size="sm" label={`Edit ${r.name}`} onClick={() => setEditing(r.id)}><PencilIcon /></IconButton>
              {delId === r.id
                ? <Button size="sm" variant="destructive" onClick={() => { deleteRecurring(r.id); setDelId(undefined); showToast('Removed') }}>Confirm</Button>
                : <IconButton size="sm" label={`Delete ${r.name}`} onClick={() => setDelId(r.id)}><TrashIcon /></IconButton>}
            </div>
          )
        })}
      {editRow && <EditDialog key={editRow.id} r={editRow} onClose={() => setEditing(undefined)} />}
    </Card>
  )
}
