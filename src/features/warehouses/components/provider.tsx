/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { WarehouseListItem } from '../data/schema'

export type WarehouseDialogType =
  | 'create'
  | 'edit'
  | 'locations'
  | 'delete'
  | 'detail'

export type WarehouseFilterStatus = 'all' | 'active' | 'inactive' | 'default' | null

interface WarehousesContextValue {
  open: WarehouseDialogType | null
  setOpen: (value: WarehouseDialogType | null) => void
  currentRow: WarehouseListItem | null
  setCurrentRow: (row: WarehouseListItem | null) => void
  isDuplicate: boolean
  setIsDuplicate: (value: boolean) => void
  filterStatus: WarehouseFilterStatus
  setFilterStatus: (status: WarehouseFilterStatus) => void
  openDetail: (row: WarehouseListItem) => void
  openEdit: (row: WarehouseListItem) => void
  openDelete: (row: WarehouseListItem) => void
  openLocations: (row: WarehouseListItem) => void
  openCreate: () => void
  openDuplicate: (row: WarehouseListItem) => void
}

const WarehousesContext = createContext<WarehousesContextValue | null>(null)

export function WarehousesProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<WarehouseDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<WarehouseListItem | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [filterStatus, setFilterStatus] = useState<WarehouseFilterStatus>(null)

  const openDetail = (row: WarehouseListItem) => {
    setCurrentRow(row)
    setIsDuplicate(false)
    setOpen('detail')
  }

  const openEdit = (row: WarehouseListItem) => {
    setCurrentRow(row)
    setIsDuplicate(false)
    setOpen('edit')
  }

  const openDelete = (row: WarehouseListItem) => {
    setCurrentRow(row)
    setIsDuplicate(false)
    setOpen('delete')
  }

  const openLocations = (row: WarehouseListItem) => {
    setCurrentRow(row)
    setIsDuplicate(false)
    setOpen('locations')
  }

  const openCreate = () => {
    setCurrentRow(null)
    setIsDuplicate(false)
    setOpen('create')
  }

  const openDuplicate = (row: WarehouseListItem) => {
    setCurrentRow(row)
    setIsDuplicate(true)
    setOpen('create')
  }

  return (
    <WarehousesContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        isDuplicate,
        setIsDuplicate,
        filterStatus,
        setFilterStatus,
        openDetail,
        openEdit,
        openDelete,
        openLocations,
        openCreate,
        openDuplicate,
      }}
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

