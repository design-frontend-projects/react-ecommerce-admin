import { PaymentMethodActionDialog } from './payment-method-action-dialog'
import { PaymentMethodDeleteDialog } from './payment-method-delete-dialog'
import { usePaymentMethodsContext } from './payment-methods-provider'

export function PaymentMethodsDialogs() {
  usePaymentMethodsContext()

  return (
    <>
      <PaymentMethodActionDialog />
      <PaymentMethodDeleteDialog />
    </>
  )
}
