import { Cell, Pie, PieChart } from 'recharts'
import type { CategorySlice } from '../../lib/calc'
import { fmtCompact } from '../../lib/money'

/** 180px category donut; total in the centre. `active` dims every other slice to 25%. */
export default function Donut({ slices, totalSpent, currency, active, onSelect }: { slices: CategorySlice[]; totalSpent: number; currency: string; active?: string | null; onSelect: (id: string | null) => void }) {
  return (
    <div className="relative h-[180px] w-[180px] shrink-0">
      <PieChart width={180} height={180}>
        <Pie data={slices} dataKey="amount" nameKey="category.name" innerRadius={56} outerRadius={88} paddingAngle={slices.length > 1 ? 2 : 0} stroke="none" cornerRadius={3} isAnimationActive={false} onClick={(_, i) => onSelect(active === slices[i].category.id ? null : slices[i].category.id)}>
          {slices.map(s => <Cell key={s.category.id} fill={s.category.color} fillOpacity={active && active !== s.category.id ? 0.25 : 1} className="t cursor-pointer outline-none" />)}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-xl text-foreground tabular-nums mt-1">{fmtCompact(totalSpent, currency)}</span>
      </div>
    </div>
  )
}
