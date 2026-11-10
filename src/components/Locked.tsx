import type { ReactNode } from 'react'
import { ArrowTopRightOnSquareIcon, CheckIcon } from '@heroicons/react/16/solid'
import type { ModuleDef, ModuleKind } from '../lib/modules'
import { Button, Card, Chip, PageHeader } from './ui'
import { useStore } from '../store'
import { useUI, type Tab } from '../ui-state'
import { hasModule } from '../lib/access'
import { MODULES } from '../lib/modules'
import { MODULE_ICON } from './Layout'
import CodeInput from './CodeInput'

/** Locked add-on: its card on top, then the real screens below, inert and dimmed. No sample data, no blur. */
export default function Locked({ module, children }: { module: ModuleDef; children: ReactNode }) {
  const Icon = MODULE_ICON[module.kind]
  return (
    <>
      <Card className="mb-6">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="h-9 w-9 shrink-0 rounded-lg bg-muted text-foreground inline-flex items-center justify-center"><Icon className="h-4 w-4" /></span>
            <div className="flex-1 min-w-0 text-sm">
              <div className="flex items-center gap-2 text-foreground">{module.name}<Chip>Locked</Chip></div>
              <div className="text-xs text-muted-foreground mt-0.5">{module.price} one time</div>
            </div>
            <Button variant="primary" className="max-sm:w-full" onClick={() => window.open(module.checkoutUrl, '_blank', 'noopener')}><span>Get {module.name}</span><ArrowTopRightOnSquareIcon /></Button>
          </div>
          <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2 text-sm text-muted-foreground leading-5">
            {module.includes.map(t => <li key={t} className="flex gap-2"><CheckIcon className="h-4 w-4 mt-0.5 shrink-0" />{t}</li>)}
          </ul>
        </div>
        <div className="border-t border-border p-4 sm:p-5">
          <CodeInput className="sm:max-w-sm" hint="Already bought it? The code is on the thank-you page after purchase." />
        </div>
      </Card>
      <div inert aria-hidden className="opacity-50 select-none">{children}</div>
    </>
  )
}

export type Screens = Partial<Record<Tab, [title: string, subtitle: string, Body: React.ComponentType]>>
/** A page of an add-on section: the header of the screen in view, then the screen, behind the add-on's card while it is locked. */
export function AddonPage({ kind, screens }: { kind: ModuleKind; screens: Screens }) {
  const tab = useUI(s => s.tab)
  const unlocked = useStore(s => hasModule(s.settings, kind))
  const [title, subtitle, Body] = screens[tab] ?? screens[kind]!
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      {unlocked ? <Body /> : <Locked module={MODULES[kind]}><Body /></Locked>}
    </>
  )
}
