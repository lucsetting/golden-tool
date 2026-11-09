import { ArrowTopRightOnSquareIcon, EnvelopeIcon } from '@heroicons/react/16/solid'
import { DIGISTORE_BUYERS_URL, DIGISTORE_SUPPORT_EMAIL, REFUND_DAYS, SUPPORT_EMAIL } from '../lib/modules'
import { Button, Card, CardHeader } from './ui'

/** Refund policy and how to request one. Shared by the Dashboard "Refund" page and Settings → Refund. */
export default function RefundContent({ narrow }: { narrow?: boolean }) {
  const rows: [string, string][] = [
    ['Guarantee', `${REFUND_DAYS} days from the purchase date.`],
    ['Handled by', 'Digistore24, the payment provider. Golden Tool never sees your card.'],
    ['Covers', 'Golden Tool, Lifetime Access and each add-on, on its own order.'],
    ['Timing', 'Confirmed by email. Refunded to the original payment method within 10 business days.'],
  ]
  return (
    <div className={narrow ? 'space-y-6' : 'grid gap-4 lg:grid-cols-2 items-start'}>
      <Card>
        <CardHeader title="Policy" />
        {rows.map(([k, v]) => (
          <div key={k} className="min-h-11 px-4 py-3 flex items-start gap-4 border-b border-border last:border-b-0">
            <span className="w-24 shrink-0 text-sm text-muted-foreground">{k}</span>
            <span className="text-sm text-foreground leading-5">{v}</span>
          </div>
        ))}
      </Card>
      <Card>
        <CardHeader title="Request a refund" />
        <ol className="px-4 py-3 space-y-3 text-sm text-foreground leading-5 list-decimal list-inside marker:text-muted-foreground">
          <li>Find the order ID in the confirmation email from Digistore24, or on the charge on your statement.</li>
          <li>Open the Digistore24 buyer page, enter the order ID and the email used at checkout.</li>
          <li>Choose the refund option. Nothing else is needed.</li>
        </ol>
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => window.open(DIGISTORE_BUYERS_URL, '_blank', 'noopener')}><ArrowTopRightOnSquareIcon /><span>Digistore24 buyer page</span></Button>
          <Button size="sm" variant="ghost" onClick={() => { location.href = `mailto:${DIGISTORE_SUPPORT_EMAIL}` }}><EnvelopeIcon /><span>{DIGISTORE_SUPPORT_EMAIL}</span></Button>
        </div>
        <div className="px-4 pb-4 text-xs text-muted-foreground leading-5">
          Questions about the app itself: <a className="text-foreground underline-offset-2 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. After a refund, remove that product's code in Settings → Billing.
        </div>
      </Card>
    </div>
  )
}
