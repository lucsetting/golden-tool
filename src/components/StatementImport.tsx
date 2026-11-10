import { useMemo, useRef, useState } from 'react'
import { ArrowUpTrayIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { dateLabel, fmt, uid } from '../lib/money'
import { undoImport } from '../lib/undo'
import { categorise, detectColumns, guessDayFirst, guessPositiveOut, parseCSV, rowKey, toRows, type Mapping } from '../lib/statement'
import { Button, Chip, Dialog, Field, Segmented, Select, Switch, cx } from './ui'

const CHUNK = 100
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`

/** Bank statement import: choose a CSV file, confirm the columns, review every line, import. The file stays in the browser. */
export default function StatementImport() {
  const open = useUI(s => s.importing)
  const expenses = useStore(s => s.expenses)
  const incomes = useStore(s => s.incomes)
  const categories = useStore(s => s.categories)
  const rules = useStore(s => s.rules)
  const currency = useStore(s => s.settings.currency)
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<{ name: string; table: string[][] } | null>(null)
  const [map, setMap] = useState<Mapping>({ header: true, date: -1, name: -1, amount: -1, debit: -1, credit: -1 })
  const [dayFirst, setDayFirst] = useState(false)
  const [positiveOut, setPositiveOut] = useState(false)
  const [withIncome, setWithIncome] = useState(false)
  const [skip, setSkip] = useState<Set<number>>(new Set()) // lines the customer unticked
  const [cats, setCats] = useState<Record<number, string>>({}) // categories the customer changed, by line
  const [shown, setShown] = useState(CHUNK)
  const close = () => useUI.getState().setImporting(false)
  const toast = useUI.getState().showToast
  // Closing forgets the file.
  if (!open && file) setFile(null)

  const load = async (f?: File) => {
    if (input.current) input.current.value = ''
    if (!f) return
    const table = parseCSV(await f.text())
    if (table.length < 2 && !table[0]?.length) return toast('This file has no lines to read', 'err')
    const m = detectColumns(table)
    setFile({ name: f.name, table }); setMap(m); setDayFirst(guessDayFirst(table, m)); setPositiveOut(guessPositiveOut(table, m))
    setWithIncome(false); setSkip(new Set()); setCats({}); setShown(CHUNK)
  }

  const rows = useMemo(() => (file ? toRows(file.table, map, dayFirst, positiveOut) : []), [file, map, dayFirst, positiveOut])
  const have = useMemo(() => new Set([...expenses.map(e => 'out' + rowKey(e.date, e.amount, e.name)), ...incomes.map(i => 'in' + rowKey(i.date, i.amount, i.source))]), [expenses, incomes])
  const view = useMemo(() => rows.map(r => {
    const income = r.amount < 0
    const dup = have.has((income ? 'in' : 'out') + rowKey(r.date, r.amount, r.name))
    return { ...r, income, dup, categoryId: cats[r.line] ?? categorise(r.name, rules, categories), on: !dup && !skip.has(r.line) && (!income || withIncome) }
  }), [rows, have, cats, skip, withIncome, rules, categories])
  const chosen = view.filter(r => r.on)
  const nOut = chosen.filter(r => !r.income).length, nIn = chosen.length - nOut
  const moneyIn = view.filter(r => r.income).length, dups = view.filter(r => r.dup).length
  const unread = file ? file.table.length - (map.header ? 1 : 0) - rows.length : 0
  // The newest import still in the lists, so a bad file can be taken back later too.
  const last = useMemo(() => {
    const recs = [...expenses, ...incomes].filter(r => r.importId)
    if (!recs.length) return null
    const newest = recs.reduce((a, b) => (b.createdAt > a.createdAt ? b : a))
    return { id: newest.importId!, count: recs.filter(r => r.importId === newest.importId).length, on: new Date(newest.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  }, [expenses, incomes])

  const run = () => {
    const importId = uid(), createdAt = Date.now()
    const out = chosen.filter(r => !r.income).map(r => ({ id: uid(), createdAt, amount: r.amount, name: r.name || 'Expense', categoryId: r.categoryId, date: r.date, importId }))
    const inc = chosen.filter(r => r.income).map(r => ({ id: uid(), createdAt, amount: -r.amount, source: r.name || 'Income', date: r.date, importId }))
    useStore.setState(s => ({ expenses: [...out, ...s.expenses], incomes: [...inc, ...s.incomes] }))
    toast(`Imported ${plural(out.length, 'expense')}${inc.length ? ` and ${plural(inc.length, 'income', 'incomes')}` : ''}`, 'ok', { label: 'Undo', run: () => undoImport(importId) })
    close()
  }

  const cols = file ? Array.from({ length: Math.max(...file.table.slice(0, 12).map(r => r.length)) }, (_, i) => ({ i, label: (map.header && file.table[0][i]) || `Column ${i + 1}` })) : []
  const pick = (label: string, key: keyof Omit<Mapping, 'header'>, extra?: React.ReactNode) => (
    <Field label={label}>
      <Select value={map[key]} onChange={e => setMap({ ...map, [key]: Number(e.target.value) })}>
        <option value={-1}>Choose…</option>
        {cols.map(c => <option key={c.i} value={c.i}>{c.label}</option>)}
        {extra}
      </Select>
    </Field>
  )
  const two = map.amount < 0 && (map.debit >= 0 || map.credit >= 0 || map.amount === -2)
  const toggle = (line: number) => setSkip(s => { const n = new Set(s); if (n.has(line)) n.delete(line); else n.add(line); return n })

  return (
    <Dialog open={open} onClose={close} width={file ? 760 : 480} title="Import a bank statement"
      description={file ? undefined : 'Download a CSV file from your bank and choose it here. You review every line before anything is saved.'}>
      <input ref={input} type="file" accept=".csv,text/csv,text/plain" hidden onChange={e => void load(e.target.files?.[0])} />
      {!file ? (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">The file is read in this browser only. It is not uploaded and not kept.</p>
          {last && (
            <div className="rounded-lg bg-muted px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-foreground">Last import: {plural(last.count, 'line')} on {last.on}</span>
              <Button size="sm" onClick={() => { undoImport(last.id); toast('Import undone') }}>Undo this import</Button>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="primary" className="max-sm:flex-1" onClick={() => input.current?.click()}><ArrowUpTrayIcon />Choose CSV file</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-foreground truncate">{file.name}</span>
            <Button size="sm" onClick={() => input.current?.click()}>Choose another file</Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {pick('Date', 'date')}
            {pick('Description', 'name')}
            <Field label="Amount">
              <Select value={two ? -2 : map.amount} onChange={e => { const v = Number(e.target.value); setMap(v === -2 ? { ...map, amount: -2 } : { ...map, amount: v, debit: -1, credit: -1 }) }}>
                <option value={-1}>Choose…</option>
                {cols.map(c => <option key={c.i} value={c.i}>{c.label}</option>)}
                <option value={-2}>Two columns: out and in</option>
              </Select>
            </Field>
            <Field label="Date format">
              <Segmented block value={dayFirst ? 'd' : 'm'} onChange={v => setDayFirst(v === 'd')} options={[{ value: 'm', label: 'Month first' }, { value: 'd', label: 'Day first' }]} />
            </Field>
            {two && pick('Money out', 'debit')}
            {two && pick('Money in', 'credit')}
          </div>

          <div className="flex flex-col gap-1">
            {!two && map.amount >= 0 && (
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm">
                <span className="text-foreground">Positive amounts are money out<span className="block text-muted-foreground">Turn on for a card statement that lists purchases as positive numbers.</span></span>
                <Switch checked={positiveOut} onChange={setPositiveOut} label="Positive amounts are money out" />
              </label>
            )}
            {moneyIn > 0 && (
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm">
                <span className="text-foreground">Add money in as income<span className="block text-muted-foreground">{plural(moneyIn, 'line')} in this file {moneyIn === 1 ? 'is' : 'are'} money coming in.</span></span>
                <Switch checked={withIncome} onChange={setWithIncome} label="Add money in as income" />
              </label>
            )}
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="min-h-9 px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground bg-muted/60 border-b border-border">
              <span className="text-foreground">{plural(rows.length, 'line')}</span>
              {dups > 0 && <span>{dups} already here</span>}
              {moneyIn > 0 && <span>{moneyIn} money in</span>}
              {unread > 0 && <span>{unread} could not be read</span>}
            </div>
            {rows.length === 0 && <p className="px-3 py-6 text-sm text-muted-foreground text-center">No line has both a date and an amount yet. Check the columns above.</p>}
            {view.slice(0, shown).map(r => (
              <div key={r.line} className={cx('px-3 py-2 flex items-center gap-3 text-sm border-b border-border last:border-b-0', !r.on && 'bg-muted/30')}>
                <label className="h-11 w-8 -my-2 shrink-0 inline-flex items-center justify-center cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" aria-label={`Import ${r.name || 'this line'}`} checked={r.on} disabled={r.dup || (r.income && !withIncome)} onChange={() => toggle(r.line)} />
                </label>
                <div className={cx('min-w-0 flex-1', !r.on && 'opacity-60')}>
                  <div className="flex items-center gap-2"><span className="truncate text-foreground">{r.name || 'No description'}</span>{r.dup && <Chip>Already here</Chip>}{r.income && <Chip tone="good">Income</Chip>}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{dateLabel(r.date)}</div>
                </div>
                {!r.income && !r.dup && (
                  <Select aria-label={`Category for ${r.name}`} className="w-32! sm:w-40! max-sm:text-sm" value={r.categoryId} onChange={e => setCats({ ...cats, [r.line]: e.target.value })}>
                    {categories.filter(c => !c.hidden || c.id === r.categoryId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                )}
                <span className={cx('w-20 sm:w-24 shrink-0 text-right tabular-nums', r.on ? 'text-foreground' : 'text-muted-foreground')}>{fmt(Math.abs(r.amount), currency)}</span>
              </div>
            ))}
            {view.length > shown && <button type="button" onClick={() => setShown(shown + CHUNK)} className="t w-full h-11 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50">Show {Math.min(CHUNK, view.length - shown)} more of {view.length}</button>}
          </div>

          {/* Sticks to the bottom of the dialog, so the action stays in reach on a long statement. */}
          <div className="sticky bottom-0 -mx-5 -mb-[calc(20px+env(safe-area-inset-bottom))] flex items-center justify-end gap-2 border-t border-border bg-card px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-4">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="primary" className="max-sm:flex-1" disabled={!chosen.length} onClick={run}>Import {plural(nOut, 'expense')}{nIn > 0 && ` and ${plural(nIn, 'income', 'incomes')}`}</Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
