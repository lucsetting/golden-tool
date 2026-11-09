import { ArrowTopRightOnSquareIcon, EnvelopeIcon } from '@heroicons/react/16/solid'
import { DIGISTORE_BUYERS_URL, DIGISTORE_SUPPORT_EMAIL, REFUND_DAYS, SUPPORT_EMAIL } from '../lib/modules'
import { Button, Card, CardHeader } from './ui'

const row = 'px-4 py-3.5 flex items-start gap-3 text-sm border-b border-border'

/** Refund policy and how to request one. Shared by the Dashboard "Refund" page and Settings → Refund. */
export default function RefundContent({ narrow }: { narrow?: boolean }) {
  const rows: [string, string][] = [
    ['Guarantee', `${REFUND_DAYS} days from the purchase date.`],
    ['Handled by', 'Digistore24, the payment provider. Golden Tool never sees your card.'],
    ['Covers', 'Golden Tool, Lifetime Access and each add-on, on its own order.'],
    ['Timing', 'Confirmed by email. Refunded to the original payment method within 10 business days.'],
  ]
  const steps = [
    'Find the order ID in the confirmation email from Digistore24, or on the charge on your statement.',
    'Open the Digistore24 buyer page, enter the order ID and the email used at checkout.',
    'Choose the refund option. Nothing else is needed.',
  ]
  return (
    <div className={narrow ? 'space-y-6' : 'grid gap-6 lg:grid-cols-2 items-start'}>
      <Card>
        <CardHeader title="Policy" />
        <div className="[&>:last-child]:border-b-0">{rows.map(([k, v]) => (
          <div key={k} className={row}>
            <span className="w-24 shrink-0 text-muted-foreground">{k}</span>
            <span className="text-foreground leading-5">{v}</span>
          </div>
        ))}</div>
      </Card>
      <Card>
        <CardHeader title="Request a refund" />
        <ol>
          {steps.map((s, i) => (
            <li key={s} className={row}>
              <span className="h-5 w-5 shrink-0 rounded-sm bg-muted text-xs text-muted-foreground inline-flex items-center justify-center tabular-nums">{i + 1}</span>
              <span className="text-foreground leading-5">{s}</span>
            </li>
          ))}
        </ol>
        <div className="p-4 flex flex-wrap gap-2">
          <Button className="max-sm:w-full" onClick={() => window.open(DIGISTORE_BUYERS_URL, '_blank', 'noopener')}><ArrowTopRightOnSquareIcon /><span>Digistore24 buyer page</span></Button>
          <Button variant="ghost" className="max-sm:w-full" onClick={() => { location.href = `mailto:${DIGISTORE_SUPPORT_EMAIL}` }}><EnvelopeIcon /><span>{DIGISTORE_SUPPORT_EMAIL}</span></Button>
        </div>
        <p className="px-4 py-3 border-t border-border bg-muted/60 text-xs text-muted-foreground leading-5">
          Questions about the app itself: <a className="text-foreground underline-offset-2 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. After a refund, remove that product's code in Settings → Billing.
        </p>
      </Card>
    </div>
  )
}
