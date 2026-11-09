import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { daysInMonth, todayISO } from '../lib/money'
import { Button, Dialog, Field, Input, Switch } from './ui'
import CategoryPicker from './CategoryPicker'

const LAST_CAT = 'golden-tool:lastCat'
const lastCat = () => { try { return localStorage.getItem(LAST_CAT) } catch { return null } }
const yesterdayISO = () => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
/** "12,50" and "12.5" both work */
export const parseAmount = (s: string) => Math.round(Number(s.replace(',', '.')) * 100) / 100

function Form({ editingId }: { editingId?: string }) {
  const { expenses, categories, settings, addExpense, updateExpense, deleteExpense, addRecurring } = useStore()
  const { closeSheet, showToast } = useUI()
  const editing = expenses.find(e => e.id === editingId)
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [name, setName] = useState(editing?.name ?? '')
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? (categories.find(c => c.id === lastCat())?.id ?? categories[0]?.id ?? 'other'))
  const [date, setDate] = useState(editing?.date ?? todayISO())
  const [note, setNote] = useState(editing?.note ?? '')
  const [repeat, setRepeat] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({})
  const today = todayISO()
  const symbol = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.currency }).formatToParts(0).find(p => p.type === 'currency')?.value ?? '$', [settings.currency])
  const suggestions = useMemo(() => {
    const n = new Map<string, number>()
    for (const e of expenses) n.set(e.name, (n.get(e.name) ?? 0) + 1)
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k]) => k)
  }, [expenses])
  const day = Number(date.slice(8, 10)) || 1

  const save = () => {
    const amt = parseAmount(amount)
    const errs: typeof errors = {}
    if (!(amt > 0)) errs.amount = 'Enter an amount greater than 0'
    if (!date || date > today) errs.date = 'Pick a valid date (not in the future)'
    setErrors(errs)
    if (errs.amount || errs.date) return
    const finalName = name.trim() || categories.find(c => c.id === categoryId)?.name || 'Expense'
    const noteVal = note.trim() || undefined
    if (editing) updateExpense(editing.id, { amount: amt, name: finalName, categoryId, date, note: noteVal })
    else if (repeat) addRecurring({ amount: amt, categoryId, name: finalName, dayOfMonth: Math.min(day, daysInMonth(date.slice(0, 7))), active: true })
    else addExpense({ amount: amt, name: finalName, categoryId, date, note: noteVal })
    try { localStorage.setItem(LAST_CAT, categoryId) } catch { /* private mode */ }
    showToast(repeat && !editing ? 'Saved as monthly' : 'Saved')
    closeSheet()
  }
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); save() } }

  return (
    <form className="flex flex-col gap-5" onSubmit={e => { e.preventDefault(); save() }}>
      <Field label="Amount" error={errors.amount}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground pointer-events-none">{symbol}</span>
          <Input autoFocus inputMode="decimal" placeholder="0.00" value={amount} onKeyDown={onEnter} style={{ paddingLeft: `${symbol.length * 1 + 1.5}rem` }}
            onChange={e => { setAmount(e.target.value.replace(/[^\d.,]/g, '')); setErrors(x => ({ ...x, amount: undefined })) }} className="text-2xl h-12 tabular-nums" />
        </div>
      </Field>
      <Field label="Name">
        <Input list="expense-names" value={name} onChange={e => setName(e.target.value)} placeholder="Where did it go?" autoComplete="off" />
        <datalist id="expense-names">{suggestions.map(s => <option key={s} value={s} />)}</datalist>
      </Field>
      <div>
        <span className="block text-sm text-foreground mb-3">Category</span>
        <CategoryPicker value={categoryId} onChange={setCategoryId} />
      </div>
      <Field label="Date" error={errors.date}>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} max={today} onChange={e => { setDate(e.target.value); setErrors(x => ({ ...x, date: undefined })) }} />
          <Button type="button" size="sm" className="shrink-0" onClick={() => setDate(today)}>Today</Button>
          <Button type="button" size="sm" className="shrink-0" onClick={() => setDate(yesterdayISO())}>Yesterday</Button>
        </div>
      </Field>
      <Field label="Note"><Input value={note} onChange={e => setNote(e.target.value)} onKeyDown={onEnter} placeholder="Optional" /></Field>
      {!editing && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-foreground">Repeat monthly</div>
            <div className="text-sm text-muted-foreground mt-1">Added automatically on day {day} every month</div>
          </div>
          <Switch checked={repeat} onChange={setRepeat} label="Repeat monthly" />
        </div>
      )}
      <div className="flex items-center justify-between pt-4">
        <div>
          {editing && <Button type="button" variant="destructive" onClick={() => { if (confirmDel) { deleteExpense(editing.id); showToast('Deleted'); closeSheet() } else setConfirmDel(true) }}>{confirmDel ? 'Confirm delete' : 'Delete'}</Button>}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={closeSheet}>Cancel</Button>
          <Button type="submit" variant="primary">Save</Button>
        </div>
      </div>
    </form>
  )
}

export default function ExpenseSheet() {
  const sheet = useUI(s => s.sheet)
  const closeSheet = useUI(s => s.closeSheet)
  return (
    <Dialog open={sheet.open} onClose={closeSheet} title={sheet.editingId ? 'Edit expense' : 'Add expense'} description="Log what you spent and where it went.">
      <Form key={sheet.editingId ?? 'new'} editingId={sheet.editingId} />
    </Dialog>
  )
}
