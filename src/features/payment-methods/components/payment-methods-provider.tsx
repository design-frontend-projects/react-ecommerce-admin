import { createContext, useContext, useState } from 'react'
import { type PaymentMethod } from '../hooks/use-payment-methods'

interface PaymentMethodsContextType {
  open: 'create' | 'update' | 'delete' | null
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  currentRow: PaymentMethod | null
  setCurrentRow: (row: PaymentMethod | null) => void
}

const PaymentMethodsContext = createContext<PaymentMethodsContextType | null>(
  null
)

export function PaymentMethodsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState<'create' | 'update' | 'delete' | null>(null)
  const [currentRow, setCurrentRow] = useState<PaymentMethod | null>(null)

  return (
    <PaymentMethodsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </PaymentMethodsContext.Provider>
  )
}

export const usePaymentMethodsContext = () => {
  const context = useContext(PaymentMethodsContext)
  if (!context) {
    throw new Error(
      'usePaymentMethodsContext must be used within <PaymentMethodsProvider>'
    )
  }
  return context
}
