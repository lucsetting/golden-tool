import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { SECTION_TABS, useUI, type Tab } from '../ui-state'
import { dateLabel, fmt } from '../lib/money'
import { CategoryBadge, cx } from './ui'

type Item = { id: string; kind: 'page' | 'expense' | 'action'; label: string; sub?: string; run: () => void; badge?: { icon: string; color: string } }

const PAGE_GROUP: Record<string, string> = { dashboard: 'Dashboard', debts: 'Golden Freedom', goals: 'Golden Goals', reports: 'Golden Vision', settings: 'Settings' }

/** Nevian-style quick search: a small button in the top bar, ⌘K opens a palette over pages, expenses and actions. */
export function QuickSearchButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <>
      <button onClick={() => setOpen(true)} className={cx('t relative before:absolute before:-inset-y-1.5 before:inset-x-0 h-8 w-full max-w-[240px] px-2.5 rounded-lg bg-muted flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted-2/60', className)}>
        <MagnifyingGlassIcon className="h-4 w-4" /><span className="flex-1 text-left">Search</span><kbd className="hidden sm:inline text-[11px] px-1 rounded-sm bg-muted">⌘K</kbd>
      </button>
      {open && <Palette onClose={() => setOpen(false)} />}
    </>
  )
}

function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const expenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const { setTab, openSheet } = useUI.getState()
  const go = (t: Tab) => { setTab(t); onClose() }

  const items = useMemo<Item[]>(() => {
    const pages: Item[] = Object.entries(SECTION_TABS).flatMap(([sec, tabs]) => tabs.map(t => ({ id: 'p:' + t.tab, kind: 'page' as const, label: t.label, sub: PAGE_GROUP[sec], run: () => go(t.tab) })))
    const actions: Item[] = [{ id: 'a:add', kind: 'action', label: 'Add expense', sub: 'N', run: () => { onClose(); openSheet() } }]
    const s = q.trim().toLowerCase()
    if (!s) return [...actions, ...pages]
    const match = (x: string) => x.toLowerCase().includes(s)
    const exps: Item[] = expenses.filter(e => match(e.name) || match(e.note ?? '')).slice(0, 8).map(e => {
      const c = categories.find(c => c.id === e.categoryId)
      return { id: 'e:' + e.id, kind: 'expense' as const, label: e.name, sub: `${c?.name ?? 'Other'} · ${dateLabel(e.date)} · ${fmt(e.amount)}`, badge: c, run: () => { setTab('activity'); onClose(); openSheet(e.id) } }
    })
    return [...actions.filter(a => match(a.label)), ...pages.filter(p => match(p.label) || match(p.sub ?? '')), ...exps]
  }, [q, expenses, categories]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setI(0) }, [q])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setI(x => Math.min(items.length - 1, x + 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setI(x => Math.max(0, x - 1)) }
      if (e.key === 'Enter') items[i]?.run()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, i, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 animate-[fadeIn_.15s]" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-card shadow-[var(--shadow-popover)] overflow-hidden animate-[dialogIn_.15s_var(--ease-standard)]">
        <div className="h-12 px-4 flex items-center gap-3 border-b border-border">
          <MagnifyingGlassIcon className="h-4 w-4 text-muted-foreground" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search pages and expenses" className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground" />
          <kbd className="text-[11px] px-1 rounded-sm bg-muted text-muted-foreground">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1">
          {items.length === 0 && <li className="px-3 py-6 text-sm text-muted-foreground text-center">Nothing matches.</li>}
          {items.map((it, idx) => (
            <li key={it.id}>
              <button onMouseEnter={() => setI(idx)} onClick={it.run} className={cx('t w-full h-10 px-3 rounded-lg flex items-center gap-3 text-left text-sm', idx === i ? 'bg-muted text-foreground' : 'text-foreground')}>
                {it.badge ? <CategoryBadge category={it.badge} size={20} /> : <span className="h-5 w-5 rounded-md bg-muted inline-flex items-center justify-center text-[10px] uppercase text-muted-foreground">{it.kind === 'page' ? 'P' : 'A'}</span>}
                <span className="flex-1 truncate">{it.label}</span>
                {it.sub && <span className="text-xs text-muted-foreground truncate max-w-[55%]">{it.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
