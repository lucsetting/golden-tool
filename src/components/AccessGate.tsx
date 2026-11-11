import { useUI } from '../ui-state'
import { ACCESS_DAYS } from '../lib/modules'
import { Button, Dialog } from './ui'

/** Shown instead of the expense sheet and the statement import once the included access ended. Data stays visible and exportable. */
export default function AccessGate() {
  const open = useUI(s => s.sheet.open || s.importing)
  const close = () => { useUI.getState().closeSheet(); useUI.getState().setImporting(false) }
  return (
    <Dialog open={open} onClose={close} title="Included access ended" description={`Golden Tool includes ${ACCESS_DAYS / 365 * 12} months of access. Everything you logged stays here and can be exported.`} width={440}>
      <div className="flex justify-end mt-5">
        <Button variant="primary" onClick={close}>Close</Button>
      </div>
    </Dialog>
  )
}
