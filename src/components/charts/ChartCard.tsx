import { Card } from '../ui'

/** One entry of a chart legend: a coloured dot and its series name. */
export const LegendKey = ({ color, children }: { color: string; children: string }) => (
  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{children}</span>
)

/** Chart card: muted label, large value and a sub-line above the plot. `right` sits top right (legend, note). */
export default function ChartCard({ label, value, sub, right, children }: { label: string; value: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <div className="p-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl sm:text-3xl text-foreground tabular-nums tracking-tight mt-2">{value}</div>
          {sub && <div className="text-sm text-muted-foreground mt-2">{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </Card>
  )
}
