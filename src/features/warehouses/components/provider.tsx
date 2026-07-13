import { createContext, useContext, useState, type ReactNode } from 'react'
import type { WarehouseListItem } from '../data/schema'

export type WarehouseDialogType = 'create' | 'edit' | 'locations' | 'delete'

interface WarehousesContextValue {
  open: WarehouseDialogType | null
  setOpen: (value: WarehouseDialogType | null) => void
  currentRow: WarehouseListItem | null
  setCurrentRow: (row: WarehouseListItem | null) => void
}

const WarehousesContext = createContext<WarehousesContextValue | null>(null)

export function WarehousesProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<WarehouseDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<WarehouseListItem | null>(null)

  return (
    <WarehousesContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </WarehousesContext.Provider>
  )
}

export function useWarehousesContext(): WarehousesContextValue {
  const context = useContext(WarehousesContext)
  if (!context) {
    throw new Error(
      'useWarehousesContext must be used within a WarehousesProvider'
    )
  }
  return context
}
