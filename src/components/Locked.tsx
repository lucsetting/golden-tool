import { useState, type ReactNode } from 'react'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/16/solid'
import type { ModuleDef } from '../lib/modules'
import { Button, Chip, PageHeader } from './ui'
import CodeInput from './CodeInput'

/**
 * Gated add-on, Mochi Billing style: a plain plan card on top, then the real module UI below, inert.
 * No sample data, no blur: the buyer sees the actual screens they would get.
 */
export default function Locked({ module, icon, subtitle, children }: { module: ModuleDef; icon: ReactNode; subtitle: string; children: ReactNode }) {
  const [code, setCode] = useState(false)
  return (
    <>
      <PageHeader title={module.name} subtitle={subtitle} />
      <section className="rounded-2xl bg-card border border-border p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <span className="h-9 w-9 rounded-full bg-muted text-foreground inline-flex items-center justify-center [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={() => window.open(module.checkoutUrl, '_blank', 'noopener')}><ArrowTopRightOnSquareIcon /><span>Add to my plan</span></Button>
            <Button size="sm" open={code} onClick={() => setCode(v => !v)}>Enter code</Button>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2">
          <span className="text-sm text-foreground">{module.name}</span>
          <span className="text-sm text-muted-foreground">{module.price} one time</span>
          <Chip>Not in your plan</Chip>
        </div>
        <p className="text-sm text-muted-foreground mt-2 leading-5">{module.tagline}</p>
        {code && <CodeInput compact className="mt-4 max-w-sm" />}
      </section>
      <div inert className="opacity-60 select-none" aria-hidden>{children}</div>
    </>
  )
}
