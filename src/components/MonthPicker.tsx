import { CalendarIcon, ChevronDownIcon } from '@heroicons/react/16/solid'
import { useUI } from '../ui-state'
import { currentMonthKey, monthLabel, shiftMonth } from '../lib/money'
import { Button, Menu, MenuItem } from './ui'

/** Mochi "This Month" dropdown: last 12 months, newest first. Writes useUI.month. */
export default function MonthPicker({ className }: { className?: string }) {
  const month = useUI(s => s.month)
  const setMonth = useUI(s => s.setMonth)
  const cur = currentMonthKey()
  return (
    <Menu className={className} trigger={open => <Button open={open}><CalendarIcon />{monthLabel(month)}<ChevronDownIcon /></Button>}>
      {close => Array.from({ length: 12 }, (_, i) => shiftMonth(cur, -i)).map(mk => (
        <MenuItem key={mk} selected={mk === month} onClick={() => { setMonth(mk); close() }}>{monthLabel(mk)}</MenuItem>
      ))}
    </Menu>
  )
}
