import React, { useState, useCallback, useMemo } from 'react'
import { type Category } from '../hooks/use-categories'

type CategoriesDialogType = 'create' | 'edit' | 'delete' | null

interface CategoriesContextType {
  open: CategoriesDialogType
  setOpen: (type: CategoriesDialogType) => void
  currentRow: Category | null
  setCurrentRow: (row: Category | null) => void
}

const CategoriesContext = React.createContext<CategoriesContextType | null>(
  null
)

interface CategoriesProviderProps {
  children: React.ReactNode
}

export function CategoriesProvider({ children }: CategoriesProviderProps) {
  const [open, setOpen] = useState<CategoriesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Category | null>(null)

  const handleSetOpen = useCallback((type: CategoriesDialogType) => {
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
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  )
}

export const useCategoriesContext = () => {
  const context = React.useContext(CategoriesContext)

  if (!context) {
    throw new Error(
      'useCategoriesContext must be used within <CategoriesProvider>'
    )
  }

  return context
}
