import { Area, AreaChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from 'recharts'
import type { dailyCumulative } from '../../lib/calc'
import { fmt } from '../../lib/money'

type Pt = ReturnType<typeof dailyCumulative>[number]

export const tipStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)', fontSize: 12, boxShadow: 'var(--shadow-popover)' }

/** Cumulative spending by day: near-black line (red when the month is over its limit) over a light grey limit pace.
 *  No axes; the first and last day sit under the plot. */
export default function SpendCurve({ data, currency, showPace, over, monthName }: { data: Pt[]; currency: string; showPace: boolean; over: boolean; monthName: string }) {
  const color = over ? 'var(--destructive)' : 'var(--chart)'
  const tip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as Pt
    return (
      <div className="rounded-lg bg-card px-3 py-2 text-xs text-foreground shadow-[var(--shadow-popover)]">
        <div className="text-muted-foreground mb-1.5">{monthName} {p.day}</div>
        {p.spent != null && <div className="tabular-nums">Spent {fmt(p.spent, currency)}</div>}
        {showPace && <div className="tabular-nums text-muted-foreground mt-1">Limit pace {fmt(p.ideal, currency)}</div>}
      </div>
    )
  }
  return (
    <>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={0.12} /><stop offset="1" stopColor={color} stopOpacity={0} /></linearGradient></defs>
            <Tooltip content={tip} cursor={{ stroke: 'var(--border)' }} />
            {showPace && <Area type="linear" dataKey="ideal" stroke="var(--chart-soft)" strokeWidth={1.5} fill="none" dot={false} activeDot={false} isAnimationActive={false} />}
            <Area type="monotone" dataKey="spent" stroke={color} strokeWidth={2} fill="url(#spendFill)" dot={false} activeDot={{ r: 4, fill: color, stroke: 'var(--card)' }} connectNulls={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="h-9 px-5 flex items-center justify-between text-xs text-muted-foreground border-t border-border">
        <span>{monthName} 1</span><span>{monthName} {data.length}</span>
      </div>
    </>
  )
}
