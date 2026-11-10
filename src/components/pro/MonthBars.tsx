import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { fmt } from '../../lib/money'
import { tipStyle } from '../charts/SpendCurve'

/** Bar chart with no grid and no y axis. `active` index = dark, others soft (all dark when omitted). A bar over `limit` is red.
 *  `more` stacks a soft part on top of a bar: what is still expected for that month. */
export default function MonthBars({ data, currency, limit, active, height = 220, names = ['Spent', 'Expected'] }: { data: { label: string; value: number; more?: number }[]; currency: string; limit?: number; active?: number; height?: number; names?: [string, string] }) {
  const stacked = data.some(d => d.more)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'var(--muted)' }} formatter={(v, name) => [fmt(Number(v), currency, { maximumFractionDigits: 0 }), name === 'more' ? names[1] : names[0]]} contentStyle={tipStyle} />
        {limit ? <ReferenceLine y={limit} stroke="var(--muted-foreground)" strokeDasharray="4 4" /> : null}
        <Bar dataKey="value" stackId="month" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} radius={(d.more ? 0 : undefined) as never} fill={limit && d.value > limit ? 'var(--destructive)' : active === undefined || i === active ? 'var(--chart)' : 'var(--chart-soft)'} />)}
        </Bar>
        {stacked && <Bar dataKey="more" stackId="month" fill="var(--chart-soft)" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />}
      </BarChart>
    </ResponsiveContainer>
  )
}
