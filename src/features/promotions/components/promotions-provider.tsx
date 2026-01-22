import React, { useState, useCallback, useMemo } from 'react'
import { type Promotion } from '../hooks/use-promotions'

type PromotionsDialogType = 'create' | 'edit' | 'delete' | null

interface PromotionsContextType {
  open: PromotionsDialogType
  setOpen: (type: PromotionsDialogType) => void
  currentRow: Promotion | null
  setCurrentRow: (row: Promotion | null) => void
}

const PromotionsContext = React.createContext<PromotionsContextType | null>(
  null
)

interface PromotionsProviderProps {
  children: React.ReactNode
}

export function PromotionsProvider({ children }: PromotionsProviderProps) {
  const [open, setOpen] = useState<PromotionsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Promotion | null>(null)

  const handleSetOpen = useCallback((type: PromotionsDialogType) => {
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
    <PromotionsContext.Provider value={value}>
      {children}
    </PromotionsContext.Provider>
  )
}

export const usePromotionsContext = () => {
  const context = React.useContext(PromotionsContext)

  if (!context) {
    throw new Error(
      'usePromotionsContext must be used within <PromotionsProvider>'
    )
  }

  return context
}
