import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { addDays, daysInMonth, parseAmount, todayISO } from '../lib/money'
import { ruleFor } from '../lib/calc'
import { deleteWithUndo } from '../lib/undo'
import { Button, Dialog, Field, Input, Switch, cx, dialogFooterCls, inputCls } from './ui'
import CategoryPicker from './CategoryPicker'

const LAST_CAT = 'golden-tool:lastCat'
const lastCat = () => { try { return localStorage.getItem(LAST_CAT) } catch { return null } }
/** A tag as it is stored: lower case, no leading #, no commas. */
const cleanTag = (s: string) => s.trim().toLowerCase().replace(/^#+/, '').replace(/,/g, '').slice(0, 24)

/** Add and edit form. Stays mounted while closed (`keepMounted`), so opening it is only a state reset and a focus. */
export default function ExpenseSheet() {
  const open = useUI(s => s.sheet.open)
  const editingId = useUI(s => s.sheet.editingId)
  const closeSheet = useUI(s => s.closeSheet)
  const editing = useStore(s => (editingId ? s.expenses.find(e => e.id === editingId) : undefined))
  const expenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const currency = useStore(s => s.settings.currency)
  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('other')
  const [date, setDate] = useState(todayISO)
  const [note, setNote] = useState('')
  const [repeat, setRepeat] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagText, setTagText] = useState('')
  /** true once the customer chose the category by hand: a category rule no longer changes it */
  const [picked, setPicked] = useState(false)
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({})
  const amountRef = useRef<HTMLInputElement>(null)

  // Load the form when the sheet opens or moves to another expense (state adjusted during render, no remount).
  const target = open ? editingId ?? 'new' : null
  const [loaded, setLoaded] = useState<string | null>(null)
  if (target !== loaded) {
    setLoaded(target)
    if (target) {
      const last = lastCat()
      setAmount(editing ? String(editing.amount) : '')
      setName(editing?.name ?? '')
      setCategoryId(editing?.categoryId ?? (categories.find(c => c.id === last && !c.hidden) ?? categories.find(c => !c.hidden))?.id ?? 'other')
      setDate(editing?.date ?? todayISO())
      setNote(editing?.note ?? '')
      setRepeat(false)
      setTags(editing?.tags ?? []); setTagText('')
      setPicked(!!editing)
      setErrors({})
    }
  }
  useLayoutEffect(() => { if (target) { amountRef.current?.focus(); amountRef.current?.select() } }, [target])

  const today = todayISO()
  const symbol = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency }).formatToParts(0).find(p => p.type === 'currency')?.value ?? '$', [currency])
  const suggestions = useMemo(() => {
    const n = new Map<string, number>()
    for (const e of expenses) n.set(e.name, (n.get(e.name) ?? 0) + 1)
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k]) => k)
  }, [expenses])
  const day = Number(date.slice(8, 10)) || 1
  const knownTags = useMemo(() => {
    const n = new Map<string, number>()
    for (const e of expenses) for (const t of e.tags ?? []) n.set(t, (n.get(t) ?? 0) + 1)
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  }, [expenses])
  const tagIdeas = knownTags.filter(t => !tags.includes(t) && t.startsWith(cleanTag(tagText))).slice(0, 6)
  const addTag = (raw: string) => { const t = cleanTag(raw); if (t && !tags.includes(t)) setTags([...tags, t]); setTagText('') }
  // A name the app has seen fills its category, until the customer picks one.
  const typeName = (v: string) => {
    setName(v)
    if (picked) return
    const known = ruleFor(useStore.getState().rules, v)
    if (known && categories.some(c => c.id === known && !c.hidden)) setCategoryId(known)
  }

  const save = (another = false) => {
    const amt = parseAmount(amount)
    const errs: typeof errors = {}
    if (!(amt > 0)) errs.amount = 'Enter an amount greater than 0'
    if (!date || date > today) errs.date = 'Pick a valid date (not in the future)'
    setErrors(errs)
    if (errs.amount) amountRef.current?.focus()
    if (errs.amount || errs.date) return
    const store = useStore.getState()
    const finalName = name.trim() || categories.find(c => c.id === categoryId)?.name || 'Expense'
    const noteVal = note.trim() || undefined
    const pending = cleanTag(tagText)
    const allTags = pending && !tags.includes(pending) ? [...tags, pending] : tags
    const tagVal = allTags.length ? allTags : undefined
    if (editing) store.updateExpense(editing.id, { amount: amt, name: finalName, categoryId, date, note: noteVal, tags: tagVal })
    else if (repeat) store.addRecurring({ amount: amt, categoryId, name: finalName, dayOfMonth: Math.min(day, daysInMonth(date.slice(0, 7))), active: true })
    else store.addExpense({ amount: amt, name: finalName, categoryId, date, note: noteVal, tags: tagVal })
    if (name.trim()) store.learnRule(name, categoryId)
    try { localStorage.setItem(LAST_CAT, categoryId) } catch { /* private mode */ }
    useUI.getState().showToast(repeat && !editing ? 'Saved as monthly' : 'Saved')
    if (!another) return closeSheet()
    // Next receipt: date, category and tags stay.
    setAmount(''); setName(''); setNote(''); setRepeat(false); setTagText(''); setPicked(false)
    amountRef.current?.focus()
  }

  return (
    <Dialog open={open} onClose={closeSheet} keepMounted title={editing ? 'Edit expense' : 'Add expense'}>
      {/* Enter in any single-line field submits the form. `noValidate`: the messages below replace the browser's own. */}
      <form noValidate className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); save() }}>
        <div>
          <label className="t block cursor-text rounded-xl bg-muted px-4 pt-3 pb-2.5 focus-within:shadow-[var(--shadow-focus)]">
            <span className="block text-sm text-muted-foreground">Amount</span>
            <span className="mt-1 flex items-baseline gap-1.5 text-3xl tracking-tight">
              <span className="text-muted-foreground">{symbol}</span>
              <input ref={amountRef} inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} aria-invalid={!!errors.amount}
                onChange={e => { setAmount(e.target.value.replace(/[^\d.,]/g, '')); setErrors(x => ({ ...x, amount: undefined })) }}
                className="w-full min-w-0 bg-transparent tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50" />
            </span>
          </label>
          {errors.amount && <span className="block text-xs text-destructive mt-1.5">{errors.amount}</span>}
        </div>
        <Field label="Name">
          <Input list="expense-names" value={name} onChange={e => typeName(e.target.value)} placeholder="Where did it go?" autoComplete="off" />
          <datalist id="expense-names">{suggestions.map(s => <option key={s} value={s} />)}</datalist>
        </Field>
        <div>
          <span className="block text-sm text-foreground mb-2">Category</span>
          <CategoryPicker value={categoryId} onChange={id => { setCategoryId(id); setPicked(true) }} />
        </div>
        <Field label="Date" error={errors.date}>
          <div className="flex items-center gap-2">
            <Input type="date" value={date} max={today} onChange={e => { setDate(e.target.value); setErrors(x => ({ ...x, date: undefined })) }} className="min-w-0" />
            <Button type="button" className="shrink-0" onClick={() => setDate(today)}>Today</Button>
            <Button type="button" className="shrink-0" onClick={() => setDate(addDays(today, -1))}>Yesterday</Button>
          </div>
        </Field>
        <Field label="Note"><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></Field>
        <div>
          <label htmlFor="expense-tags" className="block text-sm text-foreground mb-2">Tags</label>
          {/* The chips and the text field share one box; Enter or a comma turns the text into a chip. */}
          <div className={cx(inputCls, 'h-auto! min-h-9 max-sm:min-h-11 py-1 flex flex-wrap items-center gap-1 cursor-text focus-within:shadow-[var(--shadow-focus)]')} onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement).focus()}>
            {tags.map(t => (
              <button key={t} type="button" aria-label={`Remove tag ${t}`} onClick={() => setTags(tags.filter(x => x !== t))}
                className="t relative before:absolute before:-inset-y-2.5 before:-inset-x-0.5 h-6 pl-2 pr-1.5 rounded-sm bg-muted text-xs text-foreground inline-flex items-center gap-1 hover:bg-muted-2">{t}<span aria-hidden className="text-muted-foreground">×</span></button>
            ))}
            <input id="expense-tags" value={tagText} autoComplete="off" autoCapitalize="none" placeholder={tags.length ? '' : 'A trip, a project…'}
              onChange={e => (e.target.value.endsWith(',') ? addTag(e.target.value) : setTagText(e.target.value))}
              onKeyDown={e => {
                if (e.key === 'Enter' && cleanTag(tagText)) { e.preventDefault(); addTag(tagText) }
                if (e.key === 'Backspace' && !tagText && tags.length) setTags(tags.slice(0, -1))
              }}
              className="flex-1 min-w-24 h-6 bg-transparent outline-none placeholder:text-muted-foreground" />
          </div>
          {tagIdeas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tagIdeas.map(t => <button key={t} type="button" onClick={() => addTag(t)} className="t ctl-sm px-2.5 rounded-md bg-muted text-xs text-muted-foreground hover:text-foreground hover:bg-muted-2">{t}</button>)}
            </div>
          )}
        </div>
        {!editing && (
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm text-foreground">Repeat monthly</span>
              <span className="block text-sm text-muted-foreground mt-0.5">Added automatically on day {day} every month</span>
            </span>
            <Switch checked={repeat} onChange={setRepeat} label="Repeat monthly" />
          </label>
        )}
        <div className={dialogFooterCls}>
          {editing && <Button type="button" variant="destructive" className="mr-auto" onClick={() => { deleteWithUndo('expenses', editing.id); closeSheet() }}>Delete</Button>}
          <Button type="button" variant="ghost" className={cx('max-[359px]:hidden', !editing && 'mr-auto')} onClick={closeSheet}>Cancel</Button>
          {!editing && <Button type="button" onClick={() => save(true)}>Save and add another</Button>}
          <Button type="submit" variant="primary">Save</Button>
        </div>
      </form>
    </Dialog>
  )
}
