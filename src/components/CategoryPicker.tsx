import { useStore } from '../store'
import { CategoryBadge, cx } from './ui'

export default function CategoryPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const categories = useStore(s => s.categories)
  return (
    <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-2">
      {categories.map(c => {
        const on = c.id === value
        return (
          <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(c.id)}
            className={cx('t inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm', on ? 'bg-card text-foreground shadow-[var(--shadow-button-applied)]' : 'bg-muted text-foreground hover:bg-muted-2')}>
            <CategoryBadge category={c} size={16} />{c.name}
          </button>
        )
      })}
    </div>
  )
}
