import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowsUpDownIcon, ArrowUpTrayIcon, ChevronDownIcon, HashtagIcon, ListBulletIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { addDays, dateLabel, fmt, monthLabel, todayISO } from '../lib/money'
import { OTHER, expensesForMonth, total } from '../lib/calc'
import type { Category, Expense } from '../types'
import { Button, Card, CardHeader, CategoryBadge, Chip, Empty, Input, Menu, MenuItem, PageHeader, Segmented, TableHead, TableRow } from '../components/ui'
import MonthPicker from '../components/MonthPicker'

type Scope = 'all' | 'week' | 'bills'
type Sort = 'date' | 'amount'
const SORTS: Record<Sort, string> = { date: 'Newest first', amount: 'Largest first' }
const CHUNK = 60

/** One expense line. Memoised so that showing the next chunk draws only the new rows. */
const Row = memo(function Row({ e, c, currency }: { e: Expense; c: Category; currency: string }) {
  return (
    <TableRow onClick={() => useUI.getState().openSheet(e.id)}>
      <CategoryBadge category={c} size={32} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2"><span className="text-foreground truncate">{e.name}</span>{e.recurringId && <Chip>Bill</Chip>}{e.tags?.slice(0, 2).map(t => <Chip key={t} className="max-sm:hidden">#{t}</Chip>)}</span>
        <span className="block sm:hidden text-xs text-muted-foreground mt-0.5 truncate">{c.name} · {dateLabel(e.date)}{e.tags?.map(t => ` · #${t}`)}</span>
        {e.note && <span className="hidden sm:block text-xs text-muted-foreground mt-0.5 truncate">{e.note}</span>}
      </span>
      <span className="max-sm:hidden w-40 text-muted-foreground truncate">{c.name}</span>
      <span className="max-sm:hidden w-28 text-muted-foreground">{dateLabel(e.date)}</span>
      <span className="sm:w-28 text-right text-foreground tabular-nums">{fmt(e.amount, currency)}</span>
    </TableRow>
  )
})

export default function Activity() {
  const expenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const currency = useStore(s => s.settings.currency)
  const month = useUI(s => s.month)
  const openSheet = useUI(s => s.openSheet)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [scope, setScope] = useState<Scope>('all')
  const [sort, setSort] = useState<Sort>('date')
  const [tag, setTag] = useState('')

  const all = useMemo(() => expensesForMonth(expenses, month), [expenses, month])
  const counts = useMemo(() => { const m = new Map<string, number>(); all.forEach(e => m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + 1)); return m }, [all])
  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories])
  const activeCat = cat === 'all' || counts.has(cat) ? cat : 'all'
  // Tags are counted over every month: a trip or a project does not stop at the end of one.
  const tags = useMemo(() => { const m = new Map<string, number>(); expenses.forEach(e => e.tags?.forEach(t => m.set(t, (m.get(t) ?? 0) + 1))); return [...m.entries()].sort((a, b) => b[1] - a[1]) }, [expenses])
  const activeTag = tags.some(([t]) => t === tag) ? tag : ''
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const weekStart = addDays(todayISO(), -6)
    // Last 7 days ignores the month on screen: on the 3rd it still reaches back into the previous month. So does a tag.
    const l = (scope === 'week' ? expenses.filter(e => e.date >= weekStart) : activeTag ? expenses : all).filter(e =>
      (activeCat === 'all' || e.categoryId === activeCat) &&
      (scope !== 'bills' || !!e.recurringId) &&
      (!activeTag || !!e.tags?.includes(activeTag)) &&
      (!s || e.name.toLowerCase().includes(s) || (e.note ?? '').toLowerCase().includes(s) || !!e.tags?.some(t => t.includes(s))))
    return [...l].sort((a, b) => sort === 'amount' ? b.amount - a.amount : b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [all, expenses, q, activeCat, activeTag, scope, sort])

  // Long lists render in chunks: the first 60 rows, then 60 more each time the last line scrolls into view.
  const [page, setPage] = useState({ list, n: CHUNK })
  if (page.list !== list) setPage({ list, n: CHUNK })
  const more = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!more.current) return
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) setPage(p => ({ ...p, n: p.n + CHUNK })) }, { rootMargin: '800px' })
    io.observe(more.current)
    return () => io.disconnect()
  }, [page])

  const selected = catById.get(activeCat)
  const addBtn = (cls?: string) => <Button variant="primary" className={cls} onClick={() => openSheet()}><PlusIcon />Add expense</Button>

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle={`${all.length} ${all.length === 1 ? 'expense' : 'expenses'} · ${fmt(total(all), currency)} in ${monthLabel(month)}`}
        actions={<><MonthPicker /><Button onClick={() => useUI.getState().setImporting(true)}><ArrowUpTrayIcon />Import</Button>{addBtn('max-lg:hidden')}</>}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Segmented<Scope> value={scope} onChange={setScope} className="max-sm:flex max-sm:w-full max-sm:[&>button]:flex-1" options={[{ value: 'all', label: 'All' }, { value: 'week', label: 'Last 7 days' }, { value: 'bills', label: 'Bills' }]} />
        <Menu align="start" className="max-sm:flex-1" trigger={open => (
          <Button open={open} className="max-sm:w-full max-sm:justify-between">
            <span className="inline-flex items-center gap-1.5 min-w-0">{selected && <CategoryBadge category={selected} size={16} />}<span className="truncate">{selected?.name ?? 'All categories'}</span></span>
            <ChevronDownIcon />
          </Button>
        )}>
          {close => (
            <>
              <MenuItem selected={activeCat === 'all'} onClick={() => { setCat('all'); close() }}>All categories<span className="ml-auto text-xs text-muted-foreground tabular-nums">{all.length}</span></MenuItem>
              {categories.filter(c => counts.has(c.id)).map(c => (
                <MenuItem key={c.id} selected={activeCat === c.id} onClick={() => { setCat(c.id); close() }}>
                  <CategoryBadge category={c} size={16} />{c.name}<span className="ml-auto text-xs text-muted-foreground tabular-nums">{counts.get(c.id)}</span>
                </MenuItem>
              ))}
            </>
          )}
        </Menu>
        {tags.length > 0 && (
          <Menu align="start" className="max-sm:flex-1" trigger={open => <Button open={open} className="max-sm:w-full max-sm:justify-between"><span className="inline-flex items-center gap-1.5 min-w-0"><HashtagIcon className="h-4 w-4 text-muted-foreground" /><span className="truncate">{activeTag || 'All tags'}</span></span><ChevronDownIcon /></Button>}>
            {close => (
              <>
                <MenuItem selected={!activeTag} onClick={() => { setTag(''); close() }}>All tags</MenuItem>
                {tags.map(([t, n]) => <MenuItem key={t} selected={activeTag === t} onClick={() => { setTag(t); close() }}>{t}<span className="ml-auto text-xs text-muted-foreground tabular-nums">{n}</span></MenuItem>)}
              </>
            )}
          </Menu>
        )}
        <Menu align="start" className="max-sm:flex-1" trigger={open => <Button open={open} className="max-sm:w-full max-sm:justify-between"><span className="inline-flex items-center gap-1.5"><ArrowsUpDownIcon className="h-4 w-4 text-muted-foreground" />{SORTS[sort]}</span><ChevronDownIcon /></Button>}>
          {close => (Object.keys(SORTS) as Sort[]).map(k => <MenuItem key={k} selected={sort === k} onClick={() => { setSort(k); close() }}>{SORTS[k]}</MenuItem>)}
        </Menu>
        <div className="relative w-full sm:w-60 sm:ml-auto">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input type="search" aria-label="Search expenses" placeholder="Search name or note" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardHeader title="Expenses" icon={<ListBulletIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
          right={list.length > 0 && <span className="text-sm text-muted-foreground tabular-nums">{activeTag ? `#${activeTag}, all months · ${list.length}` : list.length === all.length ? list.length : `${list.length} of ${all.length}`} · {fmt(total(list), currency)}</span>} />
        {list.length === 0 ? (
          all.length === 0
            ? <Empty title={`No expenses in ${monthLabel(month)}`} text="Add an expense and it is listed here with its category, date and amount." action={addBtn()} />
            : <Empty title="No expenses match these filters" text={`${all.length} ${all.length === 1 ? 'expense is' : 'expenses are'} hidden by the search or the filters.`} action={<Button onClick={() => { setQ(''); setCat('all'); setScope('all'); setTag('') }}>Clear filters</Button>} />
        ) : (
          <>
            <TableHead className="max-sm:hidden">
              <span className="flex-1">Expense</span>
              <span className="w-40">Category</span>
              <span className="w-28">Date</span>
              <span className="w-28 text-right">Amount</span>
            </TableHead>
            {list.slice(0, page.n).map(e => <Row key={e.id} e={e} c={catById.get(e.categoryId) ?? OTHER} currency={currency} />)}
            {page.n < list.length && <div ref={more} className="h-11 flex items-center justify-center text-xs text-muted-foreground">Showing {page.n} of {list.length}</div>}
          </>
        )}
      </Card>

    </div>
  )
}
