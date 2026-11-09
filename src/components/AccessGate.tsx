import { ArrowTopRightOnSquareIcon } from '@heroicons/react/16/solid'
import { useUI } from '../ui-state'
import { LIFETIME, ACCESS_DAYS } from '../lib/modules'
import { Button, Dialog } from './ui'
import CodeInput from './CodeInput'

/** Shown instead of the expense sheet once the included access ended. Data stays visible and exportable. */
export default function AccessGate() {
  const { sheet, closeSheet } = useUI()
  return (
    <Dialog open={sheet.open} onClose={closeSheet} title="Included access ended" description={`Golden Tool includes ${ACCESS_DAYS / 365 * 12} months of access. Everything you logged stays here and can be exported. Lifetime Access removes the limit.`} width={440}>
      <CodeInput compact />
      <div className="flex items-center justify-between mt-5">
        <Button variant="ghost" onClick={closeSheet}>Not now</Button>
        <Button variant="primary" onClick={() => window.open(LIFETIME.checkoutUrl, '_blank', 'noopener')}><ArrowTopRightOnSquareIcon /><span>Get lifetime access · {LIFETIME.price}</span></Button>
      </div>
    </Dialog>
  )
}
