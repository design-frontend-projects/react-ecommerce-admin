import React, { useState, useCallback, useMemo } from 'react'
import { type Supplier } from '../hooks/use-suppliers'

type SuppliersDialogType = 'create' | 'edit' | 'delete' | null

interface SuppliersContextType {
  open: SuppliersDialogType
  setOpen: (type: SuppliersDialogType) => void
  currentRow: Supplier | null
  setCurrentRow: (row: Supplier | null) => void
}

const SuppliersContext = React.createContext<SuppliersContextType | null>(null)

interface SuppliersProviderProps {
  children: React.ReactNode
}

export function SuppliersProvider({ children }: SuppliersProviderProps) {
  const [open, setOpen] = useState<SuppliersDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Supplier | null>(null)

  const handleSetOpen = useCallback((type: SuppliersDialogType) => {
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
    <SuppliersContext.Provider value={value}>
      {children}
    </SuppliersContext.Provider>
  )
}

export const useSuppliersContext = () => {
  const context = React.useContext(SuppliersContext)

  if (!context) {
    throw new Error(
      'useSuppliersContext must be used within <SuppliersProvider>'
    )
  }

  return context
}
