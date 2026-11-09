import { useStore } from '../store'
import { CategoryBadge, cx } from './ui'

/** Grid of 56px cells, three across on a phone (every default name fits on one line), four from 640px. Colour stays on the badge. */
export default function CategoryPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const categories = useStore(s => s.categories)
  return (
    <div role="radiogroup" aria-label="Category" className="grid grid-cols-3 sm:grid-cols-4 gap-1">
      {categories.map(c => {
        const on = c.id === value
        return (
          <button key={c.id} type="button" role="radio" aria-checked={on} title={c.name} onClick={() => onChange(c.id)}
            className={cx('t min-h-14 min-w-0 px-1 py-1.5 rounded-lg flex flex-col items-center justify-center gap-1 text-xs leading-tight text-center text-foreground', on ? 'bg-muted font-medium shadow-[inset_0_0_0_1.5px_var(--foreground)]' : 'hover:bg-muted')}>
            <CategoryBadge category={c} />
            <span className="max-w-full line-clamp-2 break-words">{c.name}</span>
          </button>
        )
      })}
    </div>
  )
}
