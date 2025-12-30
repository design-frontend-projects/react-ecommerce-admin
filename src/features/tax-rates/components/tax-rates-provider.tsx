import React, { useState, useCallback, useMemo } from 'react'
import { type TaxRate } from '../hooks/use-tax-rates'

type TaxDialogType = 'create' | 'edit' | 'delete' | null

interface TaxContextType {
  open: TaxDialogType
  setOpen: (type: TaxDialogType) => void
  currentRow: TaxRate | null
  setCurrentRow: (row: TaxRate | null) => void
}

const TaxContext = React.createContext<TaxContextType | null>(null)

interface TaxProviderProps {
  children: React.ReactNode
}

export function TaxProvider({ children }: TaxProviderProps) {
  const [open, setOpen] = useState<TaxDialogType>(null)
  const [currentRow, setCurrentRow] = useState<TaxRate | null>(null)

  const handleSetOpen = useCallback((type: TaxDialogType) => {
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

  return <TaxContext.Provider value={value}>{children}</TaxContext.Provider>
}

export const useTaxContext = () => {
  const context = React.useContext(TaxContext)

  if (!context) {
    throw new Error('useTaxContext must be used within <TaxProvider>')
  }

  return context
}
