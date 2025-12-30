import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { CustomerCard } from '../hooks/use-customer-cards'

type CustomerCardsDialogType = 'create' | 'edit' | 'delete'

interface CustomerCardsContextType {
  open: CustomerCardsDialogType | null
  setOpen: (str: CustomerCardsDialogType | null) => void
  currentRow: CustomerCard | null
  setCurrentRow: React.Dispatch<React.SetStateAction<CustomerCard | null>>
}

const CustomerCardsContext =
  React.createContext<CustomerCardsContextType | null>(null)

interface CustomerCardsProviderProps {
  children: React.ReactNode
}

export default function CustomerCardsProvider({
  children,
}: CustomerCardsProviderProps) {
  const [open, setOpen] = useDialogState<CustomerCardsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<CustomerCard | null>(null)

  return (
    <CustomerCardsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </CustomerCardsContext.Provider>
  )
}

export const useCustomerCardsContext = () => {
  const context = React.useContext(CustomerCardsContext)

  if (!context) {
    throw new Error(
      'useCustomerCardsContext must be used within <CustomerCardsProvider>'
    )
  }

  return context
}
