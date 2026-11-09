import { useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { dateLabel, fmt, monthLabel } from '../lib/money'
import { expensesForMonth, total } from '../lib/calc'
import { Button, Card, CardHeader, CategoryBadge, Chip, Empty, Input, Menu, MenuItem, PageHeader, Segmented } from '../components/ui'
import MonthPicker from '../components/MonthPicker'
import RecurringManager from '../components/RecurringManager'

type Scope = 'all' | 'week' | 'recurring'

export default function Activity() {
  const { expenses, categories, settings } = useStore()
  const { month, openSheet } = useUI()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [scope, setScope] = useState<Scope>('all')
  const [sort, setSort] = useState<'date' | 'amount'>('date')
  const money = (n: number) => fmt(n, settings.currency)

  const all = useMemo(() => expensesForMonth(expenses, month), [expenses, month])
  const counts = useMemo(() => { const m = new Map<string, number>(); all.forEach(e => m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + 1)); return m }, [all])
  const activeCat = cat === 'all' || counts.has(cat) ? cat : 'all'
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const d = new Date(); d.setDate(d.getDate() - 6)
    const weekStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const l = all.filter(e =>
      (activeCat === 'all' || e.categoryId === activeCat) &&
      (scope === 'all' || (scope === 'week' ? e.date >= weekStart : !!e.recurringId)) &&
      (!s || e.name.toLowerCase().includes(s) || (e.note ?? '').toLowerCase().includes(s)))
    return [...l].sort((a, b) => sort === 'amount' ? b.amount - a.amount : b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [all, q, activeCat, scope, sort])
  const catOf = (id: string) => categories.find(c => c.id === id) ?? { id, name: 'Other', icon: 'Circle', color: '#8E919A' }
  const selected = categories.find(c => c.id === activeCat)
  const addBtn = <Button variant="primary" onClick={() => openSheet()}>Add expense</Button>

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle={`${all.length} ${all.length === 1 ? 'expense' : 'expenses'} · ${money(total(all))} in ${monthLabel(month)}`}
        actions={<><MonthPicker />{addBtn}</>}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Segmented<Scope> value={scope} onChange={setScope} options={[{ value: 'all', label: 'All' }, { value: 'week', label: 'This week' }, { value: 'recurring', label: 'Recurring' }]} />
        <Menu align="start" trigger={open => (
          <Button open={open}>
            {selected && <CategoryBadge category={selected} size={16} />}
            <span>{selected?.name ?? 'All categories'}</span>
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
        <div className="relative w-full sm:w-60 sm:ml-auto">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input type="search" aria-label="Search expenses" placeholder="Search name or note" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardHeader title="Transactions" right={
          <Button variant="ghost" size="sm" onClick={() => setSort(sort === 'date' ? 'amount' : 'date')}>{sort === 'date' ? 'Date' : 'Amount'}<ChevronUpDownIcon /></Button>
        } />
        {list.length === 0 ? (
          <Empty
            title={all.length === 0 ? `No expenses in ${monthLabel(month)}` : 'No matches'}
            text={all.length === 0 ? 'Log your first one in a few seconds.' : 'Try a different search or filter.'}
            action={all.length === 0 ? addBtn : <Button onClick={() => { setQ(''); setCat('all'); setScope('all') }}>Clear filters</Button>}
          />
        ) : (
          <>
            <div className="h-11 px-4 flex items-center gap-3 text-sm text-muted-foreground border-b border-border">
              <span className="flex-1">Expense</span>
              <span className="hidden sm:block w-40">Category</span>
              <span className="w-28 text-right">Amount</span>
            </div>
            {list.map(e => {
              const c = catOf(e.categoryId)
              return (
                <button key={e.id} type="button" onClick={() => openSheet(e.id)} className="t w-full h-16 px-4 flex items-center gap-3 text-left border-b border-border last:border-b-0 hover:bg-muted/40">
                  <CategoryBadge category={c} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-foreground truncate">{e.name}</span>
                    <span className="block text-xs text-muted-foreground mt-1 truncate">{e.note || c.name} · {dateLabel(e.date)}</span>
                  </span>
                  <span className="hidden sm:block w-40"><Chip>{c.name}</Chip></span>
                  <span className="w-28 text-right">
                    <span className="block text-sm text-foreground tabular-nums">{money(e.amount)}</span>
                    {e.recurringId && <span className="block text-xs text-muted-foreground mt-1">Recurring</span>}
                  </span>
                </button>
              )
            })}
          </>
        )}
      </Card>

      <div className="mt-6"><RecurringManager /></div>
    </div>
  )
}
