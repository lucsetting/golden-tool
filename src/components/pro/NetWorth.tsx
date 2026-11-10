import { useMemo, useState } from 'react'
import { PlusIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { AnimatedNumber, Button, Card, CardHeader, Chip, Dialog, Empty, Field, Input, Metric, MetricTray, Select, TableRow } from '../ui'
import ChartCard from '../charts/ChartCard'
import Curve from '../charts/Curve'
import { useUI } from '../../ui-state'
import { netWorth, netWorthLine } from '../../lib/vision'
import { currentMonthKey, fmt, monthLabel, plural } from '../../lib/money'
import { deleteWithUndo } from '../../lib/undo'
import { useDebts } from '../debts/shared'
import type { Holding } from '../../types'

type Side = 'assets' | 'liabilities'
const KINDS: Record<Side, string[]> = {
  assets: ['Cash', 'Bank account', 'Property', 'Vehicle', 'Retirement account', 'Other'],
  liabilities: ['Mortgage', 'Car loan', 'Student loan', 'Credit card', 'Other'],
}
const SINGULAR: Record<Side, string> = { assets: 'asset', liabilities: 'liability' }

function HoldingDialog({ side, holding, onClose }: { side: Side; holding?: Holding; onClose: () => void }) {
  const debts = useStore(s => s.debts)
  const [name, setName] = useState(holding?.name ?? '')
  const [kind, setKind] = useState(holding?.kind ?? KINDS[side][0])
  const [value, setValue] = useState(holding ? String(holding.value) : '')
  // A debt is already a liability: the same name typed again would count it twice.
  const counted = side === 'liabilities' && debts.some(d => d.name.trim().toLowerCase() === name.trim().toLowerCase())
  const ok = name.trim() && Number(value) > 0 && !counted
  const save = () => {
    const data = { name: name.trim(), kind, value: Number(value) }
    if (holding) useStore.getState().patchIn(side, holding.id, data); else useStore.getState().addTo(side, data)
    onClose()
  }
  return (
    <Dialog open onClose={onClose} title={`${holding ? 'Edit' : 'Add'} ${SINGULAR[side]}`}
      description={side === 'liabilities' && debts.length ? 'The debts in your payoff plan are already counted. Add only what is not there.' : undefined}>
      <div className="space-y-5">
        <Field label="Name" error={counted ? 'This debt is in your payoff plan and already counted' : undefined}><Input value={name} onChange={e => setName(e.target.value)} placeholder={side === 'assets' ? 'Savings account' : 'Mortgage'} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kind"><Select value={kind} onChange={e => setKind(e.target.value)}>{KINDS[side].map(k => <option key={k}>{k}</option>)}</Select></Field>
          <Field label={side === 'assets' ? 'Value today' : 'Owed today'}><Input type="number" inputMode="decimal" min="0" value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && ok && save()} /></Field>
        </div>
        <div className="flex items-center gap-2 [&>button]:max-sm:flex-1">
          {holding && <Button variant="destructive" onClick={() => { deleteWithUndo(side, holding.id, side === 'assets' ? 'Asset deleted' : 'Liability deleted'); onClose() }}>Delete</Button>}
          <span className="flex-1 max-sm:hidden" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!ok} onClick={save}>{holding ? 'Save' : `Add ${SINGULAR[side]}`}</Button>
        </div>
      </div>
    </Dialog>
  )
}

/** Net worth: what the customer owns and owes, the difference, and how it moved month by month. */
export default function NetWorth() {
  const assets = useStore(s => s.assets)
  const liabilities = useStore(s => s.liabilities)
  const snapshots = useStore(s => s.netWorth)
  const { now: debts, currency } = useDebts()
  const [dialog, setDialog] = useState<{ side: Side; holding?: Holding } | null>(null)
  const owing = useMemo(() => debts.filter(d => d.balance > 0), [debts])
  const nw = useMemo(() => netWorth(assets, liabilities, owing), [assets, liabilities, owing])
  const line = useMemo(() => netWorthLine(snapshots, nw, currentMonthKey()).map((s, i) => ({ x: i, label: monthLabel(s.month), value: s.net })), [snapshots, nw])
  const f = (n: number) => fmt(n, currency), f0 = (n: number) => fmt(n, currency, { maximumFractionDigits: 0 })
  const empty = !assets.length && !liabilities.length && !owing.length
  const first = line[0], change = line.length > 1 ? nw.net - first.value : 0
  const list = (side: Side, rows: Holding[]) => rows.map(h => (
    <TableRow key={h.id} onClick={() => setDialog({ side, holding: h })}>
      <span className="min-w-0 flex-1"><span className="sr-only">Edit </span><span className="block text-foreground truncate">{h.name}</span><span className="block text-xs text-muted-foreground mt-0.5">{h.kind}</span></span>
      <span className="text-foreground tabular-nums">{f(h.value)}</span>
    </TableRow>
  ))
  const add = (side: Side, primary?: boolean) => <Button variant={primary ? 'primary' : 'outline'} size={primary ? 'md' : 'sm'} className={primary ? 'max-sm:px-4' : 'relative after:absolute after:-inset-1.5'} onClick={() => setDialog({ side })}><PlusIcon /><span>Add {SINGULAR[side]}</span></Button>

  return (
    <div className="space-y-6">
      <MetricTray>
        <Metric label="Assets" value={<AnimatedNumber value={nw.assets} format={f0} />} sub={plural(assets.length, 'asset')} />
        <Metric label="Liabilities" value={<AnimatedNumber value={nw.liabilities} format={f0} />} sub={owing.length ? `${plural(owing.length, 'debt')} from the payoff plan included` : plural(liabilities.length, 'liability', 'liabilities')} />
        <Metric label="Net worth" tone={nw.net < 0 ? 'bad' : undefined} value={<AnimatedNumber value={nw.net} format={f0} />} sub="Assets minus liabilities" />
      </MetricTray>
      {!empty && (
        <ChartCard label="Net worth by month" value={<AnimatedNumber value={nw.net} format={f0} />}
          sub={line.length > 1 ? `${change >= 0 ? '+' : '−'}${f0(Math.abs(change))} since ${first.label}` : 'One point so far. A month is added each time a value changes.'}>
          <div className="pb-1"><Curve data={line} names={['Net worth']} currency={currency} /></div>
        </ChartCard>
      )}
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <Card>
          <CardHeader title="Assets" right={assets.length > 0 && add('assets')} />
          {assets.length === 0 ? <Empty title="No assets yet" text="List what you own that has a money value: accounts, a home, a car." action={add('assets', true)} /> : list('assets', assets)}
        </Card>
        <Card>
          <CardHeader title="Liabilities" right={(liabilities.length > 0 || owing.length > 0) && add('liabilities')} />
          {owing.map(d => (
            <TableRow key={d.id} onClick={() => useUI.getState().setTab('debts')}>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="text-foreground truncate">{d.name}</span><Chip>Payoff plan</Chip></span><span className="block text-xs text-muted-foreground mt-0.5">Debt · {d.apr}% APR</span></span>
              <span className="text-foreground tabular-nums">{f(d.balance)}</span>
            </TableRow>
          ))}
          {liabilities.length === 0 && owing.length === 0 ? <Empty title="No liabilities yet" text="List what you owe. Debts in a payoff plan appear here by themselves." action={add('liabilities', true)} /> : list('liabilities', liabilities)}
        </Card>
      </div>
      {dialog && <HoldingDialog side={dialog.side} holding={dialog.holding} onClose={() => setDialog(null)} />}
    </div>
  )
}
