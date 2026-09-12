import React, { useState, createContext, useContext } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Inventory } from '../data/schema'

export type InventoryDialogType = 'add' | 'edit' | 'delete' | 'detail'
export type InventoryFilterStatus = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' | null

interface InventoryContextType {
  open: InventoryDialogType | null
  setOpen: (str: InventoryDialogType | null) => void
  currentRow: Inventory | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Inventory | null>>
  filterStatus: InventoryFilterStatus
  setFilterStatus: React.Dispatch<React.SetStateAction<InventoryFilterStatus>>
  openCreate: () => void
  openEdit: (item: Inventory) => void
  openDelete: (item: Inventory) => void
  openDetail: (item: Inventory) => void
}

const InventoryContext = createContext<InventoryContextType | null>(null)

interface Props {
  children: React.ReactNode
}

export function InventoryProvider({ children }: Props) {
  const [open, setOpen] = useDialogState<InventoryDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Inventory | null>(null)
  const [filterStatus, setFilterStatus] = useState<InventoryFilterStatus>(null)

  const openCreate = () => {
    setCurrentRow(null)
    setOpen('add')
  }

  const openEdit = (item: Inventory) => {
    setCurrentRow(item)
    setOpen('edit')
  }

  const openDelete = (item: Inventory) => {
    setCurrentRow(item)
    setOpen('delete')
  }

  const openDetail = (item: Inventory) => {
    setCurrentRow(item)
    setOpen('detail')
  }

  return (
    <InventoryContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        filterStatus,
        setFilterStatus,
        openCreate,
        openEdit,
        openDelete,
        openDetail,
      }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export const useInventoryContext = () => {
  const context = useContext(InventoryContext)

  if (!context) {
    throw new Error('useInventoryContext must be used within <InventoryProvider>')
  }

  return context
}
