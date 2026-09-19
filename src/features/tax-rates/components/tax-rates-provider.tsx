import React, { useState, useCallback, useMemo } from 'react'
import {
  type TaxRate,
  type TaxRateFilterState,
  type TaxDialogType,
  initialFilterState,
} from '../types'

interface TaxContextType {
  open: TaxDialogType
  setOpen: (type: TaxDialogType) => void
  currentRow: TaxRate | null
  setCurrentRow: (row: TaxRate | null) => void
  selectedRows: TaxRate[]
  setSelectedRows: (rows: TaxRate[]) => void
  filters: TaxRateFilterState
  setFilters: React.Dispatch<React.SetStateAction<TaxRateFilterState>>
  resetFilters: () => void
}

const TaxContext = React.createContext<TaxContextType | null>(null)

interface TaxProviderProps {
  children: React.ReactNode
}

export function TaxProvider({ children }: TaxProviderProps) {
  const [open, setOpen] = useState<TaxDialogType>(null)
  const [currentRow, setCurrentRow] = useState<TaxRate | null>(null)
  const [selectedRows, setSelectedRows] = useState<TaxRate[]>([])
  const [filters, setFilters] = useState<TaxRateFilterState>(initialFilterState)

  const handleSetOpen = useCallback((type: TaxDialogType) => {
    setOpen(type)
    if (type === null) {
      setCurrentRow(null)
    }
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(initialFilterState)
  }, [])

  const value = useMemo(
    () => ({
      open,
      setOpen: handleSetOpen,
      currentRow,
      setCurrentRow,
      selectedRows,
      setSelectedRows,
      filters,
      setFilters,
      resetFilters,
    }),
    [open, currentRow, selectedRows, filters, handleSetOpen, resetFilters]
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
