import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Inventory } from '../data/schema'

type InventoryDialogType = 'add' | 'edit' | 'delete'

interface InventoryContextType {
  open: InventoryDialogType | null
  setOpen: (str: InventoryDialogType | null) => void
  currentRow: Inventory | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Inventory | null>>
}

const InventoryContext = React.createContext<InventoryContextType | null>(null)

interface Props {
  children: React.ReactNode
}

export function InventoryProvider({ children }: Props) {
  const [open, setOpen] = useDialogState<InventoryDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Inventory | null>(null)

  return (
    <InventoryContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export const useInventoryContext = () => {
  const context = React.useContext(InventoryContext)

  if (!context) {
    throw new Error(
      'useInventoryContext must be used within <InventoryProvider>'
    )
  }

  return context
}
