import { PageHeader } from '../components/ui'
import RefundContent from '../components/RefundContent'
import { REFUND_DAYS } from '../lib/modules'

export default function Refund() {
  return (
    <>
      <PageHeader title="Refund" subtitle={`Every purchase is covered by a ${REFUND_DAYS}-day money-back guarantee through Digistore24.`} />
      <RefundContent />
    </>
  )
}
