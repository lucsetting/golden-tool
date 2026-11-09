import { Area, AreaChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from 'recharts'
import type { dailyCumulative } from '../../lib/calc'
import { fmt } from '../../lib/money'

type Pt = ReturnType<typeof dailyCumulative>[number]

export const tipStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)', fontSize: 12, boxShadow: 'var(--shadow-popover)' }

/** Hero curve: gold spent area + dashed ideal line, no axes; first/last day labels sit on a bottom hairline. */
export default function SpendCurve({ data, currency, showIdeal, monthName }: { data: Pt[]; currency: string; showIdeal: boolean; monthName: string }) {
  const tip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as Pt
    return (
      <div className="rounded-lg bg-card px-3 py-2 text-xs text-foreground shadow-[var(--shadow-popover)]">
        <div className="text-muted-foreground mb-1.5">{monthName} {p.day}</div>
        {p.spent != null && <div className="tabular-nums">Spent {fmt(p.spent, currency)}</div>}
        {showIdeal && <div className="tabular-nums text-muted-foreground mt-1">Ideal {fmt(p.ideal, currency)}</div>}
      </div>
    )
  }
  return (
    <div className="relative h-[200px] border-b border-border">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spentFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip content={tip} cursor={{ stroke: 'var(--border)' }} />
          {showIdeal && <Area type="linear" dataKey="ideal" stroke="var(--muted-foreground)" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 4" fill="none" dot={false} activeDot={false} isAnimationActive={false} />}
          <Area type="monotone" dataKey="spent" stroke="var(--gold)" strokeWidth={2} fill="url(#spentFill)" dot={false} activeDot={{ r: 4, fill: 'var(--gold)', stroke: 'var(--card)' }} connectNulls={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-3 bottom-2 flex justify-between text-xs text-muted-foreground">
        <span>{monthName} 1</span><span>{monthName} {data.length}</span>
      </div>
    </div>
  )
}
