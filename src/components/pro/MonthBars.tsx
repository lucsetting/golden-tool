import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { fmt } from '../../lib/money'
import { tipStyle } from '../charts/SpendCurve'

/** Single-accent bar chart: no grid, no y axis. `active` index = gold, others muted (all gold when omitted). */
export default function MonthBars({ data, currency, limit, active, height = 220 }: { data: { label: string; value: number }[]; currency: string; limit?: number; active?: number; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'var(--muted)' }} formatter={v => fmt(Number(v), currency, { maximumFractionDigits: 0 })} contentStyle={tipStyle} />
        {limit ? <ReferenceLine y={limit} stroke="var(--muted-foreground)" strokeDasharray="4 4" /> : null}
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => <Cell key={i} fill={active === undefined || i === active ? 'var(--gold)' : 'var(--muted-2)'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
