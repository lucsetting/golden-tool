import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { fmt } from '../../lib/money'
import { tipStyle } from './SpendCurve'

/** Two bars per month: income in light grey, expenses in near-black. No grid, no y axis. */
export default function FlowBars({ data, currency, height = 220 }: { data: { label: string; income: number; spent: number }[]; currency: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barGap={2}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'var(--muted)' }} formatter={(v, name) => [fmt(Number(v), currency, { maximumFractionDigits: 0 }), name === 'income' ? 'Income' : 'Expenses']} contentStyle={tipStyle} />
        <Bar dataKey="income" fill="var(--chart-soft)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        <Bar dataKey="spent" fill="var(--chart)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
