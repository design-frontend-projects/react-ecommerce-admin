import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type CustomerGroup } from '../hooks/use-customer-groups'

type CustomerGroupsDialogType = 'create' | 'edit' | 'delete'

interface CustomerGroupsContextType {
  open: CustomerGroupsDialogType | null
  setOpen: (str: CustomerGroupsDialogType | null) => void
  currentRow: CustomerGroup | null
  setCurrentRow: React.Dispatch<React.SetStateAction<CustomerGroup | null>>
}

const CustomerGroupsContext =
  React.createContext<CustomerGroupsContextType | null>(null)

interface CustomerGroupsProviderProps {
  children: React.ReactNode
}

export default function CustomerGroupsProvider({
  children,
}: CustomerGroupsProviderProps) {
  const [open, setOpen] = useDialogState<CustomerGroupsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<CustomerGroup | null>(null)

  return (
    <CustomerGroupsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </CustomerGroupsContext.Provider>
  )
}

export const useCustomerGroupsContext = () => {
  const context = React.useContext(CustomerGroupsContext)

  if (!context) {
    throw new Error(
      'useCustomerGroupsContext must be used within <CustomerGroupsProvider>'
    )
  }

  return context
}
