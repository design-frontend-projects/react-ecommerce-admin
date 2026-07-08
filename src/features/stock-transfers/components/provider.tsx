import { createContext, useContext, useState, type ReactNode } from 'react'
import type { TransferListItem } from '../data/schema'

export type TransferDialogType = 'create' | 'view'

interface TransfersContextValue {
  open: TransferDialogType | null
  setOpen: (value: TransferDialogType | null) => void
  currentRow: TransferListItem | null
  setCurrentRow: (row: TransferListItem | null) => void
}

const TransfersContext = createContext<TransfersContextValue | null>(null)

export function TransfersProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<TransferDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<TransferListItem | null>(null)

  return (
    <TransfersContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </TransfersContext.Provider>
  )
}

export function useTransfersContext(): TransfersContextValue {
  const context = useContext(TransfersContext)
  if (!context) {
    throw new Error('useTransfersContext must be used within a TransfersProvider')
  }
  return context
}
