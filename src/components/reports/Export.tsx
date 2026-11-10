import { useState } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { Button, Card, CardHeader, Select } from '../ui'
import { monthSummary } from '../../lib/calc'
import { currentMonthKey, monthLabel, shiftMonth } from '../../lib/money'

const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

export default function Export() {
  const expenses = useStore(s => s.expenses)
  const incomes = useStore(s => s.incomes)
  const categories = useStore(s => s.categories)
  const { currency, monthlyLimit } = useStore(s => s.settings)
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(currentMonthKey(), -i))
  const [mk, setMk] = useState(months[0])
  const year = String(new Date().getFullYear())
  const text = monthSummary(expenses, categories, mk, monthlyLimit, currency)

  /** Expenses and income in one file, oldest first. `year` keeps one year only. */
  const download = (name: string, year = '') => {
    const cat = (id: string) => categories.find(c => c.id === id)?.name ?? 'Other'
    const rows = [
      ...expenses.filter(e => e.date.startsWith(year)).map(e => [e.date, 'expense', e.name, cat(e.categoryId), e.amount.toFixed(2), (e.tags ?? []).join('; '), e.note ?? '']),
      ...incomes.filter(i => i.date.startsWith(year)).map(i => [i.date, 'income', i.source, '', i.amount.toFixed(2), '', '']),
    ].sort((a, b) => a[0].localeCompare(b[0])).map(r => r.map(esc).join(','))
    const url = URL.createObjectURL(new Blob([['date,type,name,category,amount,tags,note', ...rows].join('\n')], { type: 'text/csv;charset=utf-8' }))
    Object.assign(document.createElement('a'), { href: url, download: name }).click()
    URL.revokeObjectURL(url)
  }
  const copy = () => navigator.clipboard.writeText(text).then(() => useUI.getState().showToast('Copied'), () => useUI.getState().showToast('Copy failed', 'err'))

  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      <Card>
        <CardHeader title="CSV" />
        <div className="p-5">
          <p className="text-sm text-muted-foreground leading-5">Every expense and income as date, type, name, category, amount, tags and note. Opens in Excel, Numbers or Google Sheets.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={() => download(`golden-tool-${year}.csv`, year)}><ArrowDownTrayIcon />This year</Button>
            <Button onClick={() => download('golden-tool-all.csv')}><ArrowDownTrayIcon />All time</Button>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Monthly summary" />
        <div className="p-5">
          <div className="w-48 mb-4"><Select value={mk} onChange={e => setMk(e.target.value)} aria-label="Month">{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</Select></div>
          <pre className="font-mono bg-muted rounded-md p-4 text-sm whitespace-pre-wrap text-foreground">{text}</pre>
          <Button className="mt-4" onClick={copy}>Copy</Button>
        </div>
      </Card>
    </div>
  )
}
