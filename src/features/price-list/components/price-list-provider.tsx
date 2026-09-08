import React, { useState, useCallback, useMemo } from 'react'
import type { PriceList } from '../data/schema'

export type PriceListDialogType = 'create' | 'edit' | 'delete' | 'view' | null

interface PriceListContextType {
  open: PriceListDialogType
  setOpen: (type: PriceListDialogType) => void
  currentRow: PriceList | null
  setCurrentRow: (row: PriceList | null) => void
}

const PriceListContext = React.createContext<PriceListContextType | null>(null)

interface PriceListProviderProps {
  children: React.ReactNode
}

export function PriceListProvider({ children }: PriceListProviderProps) {
  const [open, setOpen] = useState<PriceListDialogType>(null)
  const [currentRow, setCurrentRow] = useState<PriceList | null>(null)

  const handleSetOpen = useCallback((type: PriceListDialogType) => {
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
    <PriceListContext.Provider value={value}>
      {children}
    </PriceListContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePriceListContext = () => {
  const context = React.useContext(PriceListContext)

  if (!context) {
    throw new Error(
      'usePriceListContext must be used within <PriceListProvider>'
    )
  }

  return context
}
