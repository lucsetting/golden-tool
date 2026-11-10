import { useId } from 'react'
import { Area, AreaChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import { fmt } from '../../lib/money'

export interface CurvePoint { x: number; label: string; a: number | null; b?: number | null }

/** A line over time with a soft fill, and optionally a light grey line to compare it with. No axes: the first and last
 *  label sit under the plot. `dots` mark points on the main line (a debt paid off). `step` draws the main line as steps. */
export default function Curve({ data, names, currency, dots = [], step, height = 200 }: { data: CurvePoint[]; names: [string, string?]; currency: string; dots?: { x: number; y: number }[]; step?: boolean; height?: number }) {
  const id = useId()
  const tip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const p = payload[0].payload as CurvePoint
    return (
      <div className="rounded-lg bg-card px-3 py-2 text-xs text-foreground shadow-[var(--shadow-popover)]">
        <div className="text-muted-foreground mb-1.5">{p.label}</div>
        {p.a != null && <div className="tabular-nums">{names[0]} {fmt(p.a, currency)}</div>}
        {names[1] && p.b != null && <div className="tabular-nums text-muted-foreground mt-1">{names[1]} {fmt(p.b, currency)}</div>}
      </div>
    )
  }
  return (
    <>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 6 }}>
            <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart)" stopOpacity={0.12} /><stop offset="1" stopColor="var(--chart)" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} hide />
            <YAxis hide domain={[(min: number) => Math.min(0, min), 'auto']} />
            <Tooltip content={tip} cursor={{ stroke: 'var(--border)' }} />
            {names[1] && <Area type="linear" dataKey="b" stroke="var(--chart-soft)" strokeWidth={1.5} fill="none" dot={false} activeDot={false} connectNulls isAnimationActive={false} />}
            <Area type={step ? 'stepAfter' : 'linear'} dataKey="a" stroke="var(--chart)" strokeWidth={2} fill={`url(#${id})`} dot={data.length < 3 ? { r: 3, fill: 'var(--chart)' } : false} activeDot={{ r: 4, fill: 'var(--chart)', stroke: 'var(--card)' }} connectNulls={false} isAnimationActive={false} />
            {dots.map(d => <ReferenceDot key={d.x} x={d.x} y={d.y} r={4} fill="var(--card)" stroke="var(--chart)" strokeWidth={2} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="h-9 px-5 flex items-center justify-between text-xs text-muted-foreground border-t border-border">
        <span>{data[0]?.label}</span><span>{data[data.length - 1]?.label}</span>
      </div>
    </>
  )
}
