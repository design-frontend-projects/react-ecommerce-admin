import React, { useState, useCallback, useMemo } from 'react'
import { type PurchaseOrder } from '../hooks/use-purchase-orders'

type PODialogType = 'create' | 'edit' | 'delete' | 'items' | null

interface POContextType {
  open: PODialogType
  setOpen: (type: PODialogType) => void
  currentRow: PurchaseOrder | null
  setCurrentRow: (row: PurchaseOrder | null) => void
}

const POContext = React.createContext<POContextType | null>(null)

interface POProviderProps {
  children: React.ReactNode
}

export function POProvider({ children }: POProviderProps) {
  const [open, setOpen] = useState<PODialogType>(null)
  const [currentRow, setCurrentRow] = useState<PurchaseOrder | null>(null)

  const handleSetOpen = useCallback((type: PODialogType) => {
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

  return <POContext.Provider value={value}>{children}</POContext.Provider>
}

export const usePOContext = () => {
  const context = React.useContext(POContext)

  if (!context) {
    throw new Error('usePOContext must be used within <POProvider>')
  }

  return context
}
