import React, { useState, useCallback, useMemo } from 'react'
import { type Customer } from '../hooks/use-customers'

export type CustomersDialogType = 'create' | 'edit' | 'delete' | 'view' | null
export type CustomerFilterStatus = 'all' | 'active' | 'inactive' | 'loyalty' | 'grouped' | null

interface CustomersContextType {
  open: CustomersDialogType
  setOpen: (type: CustomersDialogType) => void
  currentRow: Customer | null
  setCurrentRow: (row: Customer | null) => void
  filterStatus: CustomerFilterStatus
  setFilterStatus: (status: CustomerFilterStatus) => void
}

const CustomersContext = React.createContext<CustomersContextType | null>(null)

interface CustomersProviderProps {
  children: React.ReactNode
}

export function CustomersProvider({ children }: CustomersProviderProps) {
  const [open, setOpen] = useState<CustomersDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Customer | null>(null)
  const [filterStatus, setFilterStatus] = useState<CustomerFilterStatus>(null)

  const handleSetOpen = useCallback((type: CustomersDialogType) => {
    setOpen(type)
    if (type === null) {
      setCurrentRow(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      open,
      setOpen: handleSetOpen,
      currentRow,
      setCurrentRow,
      filterStatus,
      setFilterStatus,
    }),
    [open, currentRow, filterStatus, handleSetOpen]
  )

  return (
    <CustomersContext.Provider value={value}>
      {children}
    </CustomersContext.Provider>
  )
}

export const useCustomersContext = () => {
  const context = React.useContext(CustomersContext)

  if (!context) {
    throw new Error(
      'useCustomersContext must be used within <CustomersProvider>'
    )
  }

  return context
}
