import { ChevronRightIcon, Cog6ToothIcon } from '@heroicons/react/16/solid'
import { useStore } from '../store'
import { useUI } from '../ui-state'
import { ACCESS_DAYS, LIFETIME, MODULES } from '../lib/modules'
import { daysLeft, hasModule, isLifetime } from '../lib/access'
import { Button, Card, Chip, PageHeader, cx } from '../components/ui'
import { MODULE_ICON } from '../components/Layout'
import CodeInput from '../components/CodeInput'

const row = 't w-full h-14 px-4 flex items-center gap-3 text-left border-b border-border last:border-b-0 hover:bg-muted'

export default function More() {
  const setTab = useUI(s => s.setTab)
  const settings = useStore(s => s.settings)
  const left = daysLeft(settings)

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="More" />
      <Card>
        {Object.values(MODULES).map(m => {
          const Icon = MODULE_ICON[m.kind]
          const on = hasModule(settings, m.kind)
          return (
            <button key={m.kind} onClick={() => setTab(m.kind)} className={row}>
              <span className={cx('h-6 w-6 shrink-0 rounded-md inline-flex items-center justify-center', on ? 'bg-gold-soft text-gold-ink' : 'bg-muted text-muted-foreground')}><Icon className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-foreground truncate">{m.name}</span>
                <span className="block text-xs text-muted-foreground mt-1 truncate">{on ? m.tagline.split(/[,.]/)[0] : `${m.price} · Not in your plan`}</span>
              </span>
              <Chip tone={on ? 'gold' : 'muted'}>{on ? 'Active' : 'Locked'}</Chip>
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          )
        })}
        <button onClick={() => setTab('settings')} className={row}>
          <span className="h-6 w-6 shrink-0 rounded-md bg-muted text-muted-foreground inline-flex items-center justify-center"><Cog6ToothIcon className="h-3.5 w-3.5" /></span>
          <span className="flex-1 text-sm text-foreground">Settings</span>
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
        </button>
      </Card>

      {!isLifetime(settings) && (
        <Card>
          <div className="h-11 px-4 flex items-center border-b border-border text-sm text-foreground">{LIFETIME.name}</div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-5">Keep adding expenses after your included {ACCESS_DAYS / 365 * 12} months.{left !== null && ` ${Math.max(0, left)} days left.`}</p>
            <Button variant="primary" onClick={() => window.open(LIFETIME.checkoutUrl, '_blank', 'noopener')}>{`Get Lifetime · ${LIFETIME.price}`}</Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="h-11 px-4 flex items-center border-b border-border text-sm text-foreground">Activation code</div>
        <CodeInput compact className="p-4" />
      </Card>
    </div>
  )
}
