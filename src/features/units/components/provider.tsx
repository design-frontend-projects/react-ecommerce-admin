import { createContext, useContext, useState, type ReactNode } from 'react'
import type { UomListItem } from '../data/schema'

export type UomDialogType = 'create' | 'edit' | 'delete'

interface UnitsContextValue {
  open: UomDialogType | null
  setOpen: (value: UomDialogType | null) => void
  currentRow: UomListItem | null
  setCurrentRow: (row: UomListItem | null) => void
}

const UnitsContext = createContext<UnitsContextValue | null>(null)

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<UomDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<UomListItem | null>(null)

  return (
    <UnitsContext.Provider value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </UnitsContext.Provider>
  )
}

export function useUnitsContext(): UnitsContextValue {
  const context = useContext(UnitsContext)
  if (!context) {
    throw new Error('useUnitsContext must be used within a UnitsProvider')
  }
  return context
}
