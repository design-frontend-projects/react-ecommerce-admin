import React, { useState, useCallback, useMemo } from 'react'
import { type Customer } from '../hooks/use-customers'

type CustomersDialogType = 'create' | 'edit' | 'delete' | null

interface CustomersContextType {
  open: CustomersDialogType
  setOpen: (type: CustomersDialogType) => void
  currentRow: Customer | null
  setCurrentRow: (row: Customer | null) => void
}

const CustomersContext = React.createContext<CustomersContextType | null>(null)

interface CustomersProviderProps {
  children: React.ReactNode
}

export function CustomersProvider({ children }: CustomersProviderProps) {
  const [open, setOpen] = useState<CustomersDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Customer | null>(null)

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
    }),
    [open, currentRow, handleSetOpen]
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
