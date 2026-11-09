import { useState } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/16/solid'
import { useStore } from '../../store'
import { useUI } from '../../ui-state'
import { Button, Card, CardHeader, Select } from '../ui'
import { monthSummary } from '../../lib/calc'
import { currentMonthKey, monthLabel, shiftMonth } from '../../lib/money'
import type { Expense } from '../../types'

const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

export default function Export() {
  const expenses = useStore(s => s.expenses)
  const categories = useStore(s => s.categories)
  const { currency, monthlyLimit } = useStore(s => s.settings)
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(currentMonthKey(), -i))
  const [mk, setMk] = useState(months[0])
  const year = String(new Date().getFullYear())
  const text = monthSummary(expenses, categories, mk, monthlyLimit, currency)

  const download = (list: Expense[], name: string) => {
    const cat = (id: string) => categories.find(c => c.id === id)?.name ?? 'Other'
    const rows = [...list].sort((a, b) => a.date.localeCompare(b.date)).map(e => [e.date, e.name, cat(e.categoryId), e.amount.toFixed(2), e.note ?? ''].map(esc).join(','))
    const url = URL.createObjectURL(new Blob([['date,name,category,amount,note', ...rows].join('\n')], { type: 'text/csv;charset=utf-8' }))
    Object.assign(document.createElement('a'), { href: url, download: name }).click()
    URL.revokeObjectURL(url)
  }
  const copy = () => navigator.clipboard.writeText(text).then(() => useUI.getState().showToast('Copied'), () => useUI.getState().showToast('Copy failed', 'err'))

  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      <Card>
        <CardHeader title="CSV" />
        <div className="p-5">
          <p className="text-sm text-muted-foreground leading-5">Every expense as date, name, category, amount and note. Opens in Excel, Numbers or Google Sheets.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={() => download(expenses.filter(e => e.date.startsWith(year)), `golden-tool-${year}.csv`)}><ArrowDownTrayIcon />This year</Button>
            <Button onClick={() => download(expenses, 'golden-tool-all.csv')}><ArrowDownTrayIcon />All time</Button>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Monthly summary" right={<div className="w-40"><Select value={mk} onChange={e => setMk(e.target.value)} aria-label="Month">{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</Select></div>} />
        <div className="p-5">
          <pre className="font-mono bg-muted rounded-md p-4 text-sm whitespace-pre-wrap text-foreground">{text}</pre>
          <Button className="mt-4" onClick={copy}>Copy</Button>
        </div>
      </Card>
    </div>
  )
}
