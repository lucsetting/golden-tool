import { ArrowTopRightOnSquareIcon } from '@heroicons/react/16/solid'
import { useUI } from '../ui-state'
import { LIFETIME, ACCESS_DAYS } from '../lib/modules'
import { Button, Dialog } from './ui'
import CodeInput from './CodeInput'

/** Shown instead of the expense sheet once the included access ended. Data stays visible and exportable. */
export default function AccessGate() {
  const open = useUI(s => s.sheet.open)
  const close = useUI(s => s.closeSheet)
  return (
    <Dialog open={open} onClose={close} title="Included access ended" description={`Golden Tool includes ${ACCESS_DAYS / 365 * 12} months of access. Everything you logged stays here and can be exported. Lifetime Access removes the limit.`} width={440}>
      <CodeInput />
      <div className="flex flex-col-reverse gap-2 mt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={close}>Not now</Button>
        <Button variant="primary" onClick={() => window.open(LIFETIME.checkoutUrl, '_blank', 'noopener')}><ArrowTopRightOnSquareIcon /><span>Get lifetime access · {LIFETIME.price}</span></Button>
      </div>
    </Dialog>
  )
}
