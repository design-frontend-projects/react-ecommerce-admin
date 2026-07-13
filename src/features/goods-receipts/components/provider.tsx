import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ReceiptListItem } from '../data/schema'

export type ReceiptDialogType = 'create' | 'view'

interface ReceiptsContextValue {
  open: ReceiptDialogType | null
  setOpen: (value: ReceiptDialogType | null) => void
  currentRow: ReceiptListItem | null
  setCurrentRow: (row: ReceiptListItem | null) => void
}

const ReceiptsContext = createContext<ReceiptsContextValue | null>(null)

export function ReceiptsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<ReceiptDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<ReceiptListItem | null>(null)

  return (
    <ReceiptsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </ReceiptsContext.Provider>
  )
}

export function useReceiptsContext(): ReceiptsContextValue {
  const context = useContext(ReceiptsContext)
  if (!context) {
    throw new Error('useReceiptsContext must be used within a ReceiptsProvider')
  }
  return context
}
