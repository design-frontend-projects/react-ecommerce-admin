import { usePaymentMethodsContext } from './payment-methods-provider'
import { PaymentMethodActionDialog } from './payment-method-action-dialog'
import { PaymentMethodDeleteDialog } from './payment-method-delete-dialog'

export function PaymentMethodsDialogs() {
  usePaymentMethodsContext()

  return (
    <>
      <PaymentMethodActionDialog />
      <PaymentMethodDeleteDialog />
    </>
  )
}
