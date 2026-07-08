import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AdjustmentListItem } from '../data/schema'

export type AdjustmentDialogType = 'create' | 'view'

interface AdjustmentsContextValue {
  open: AdjustmentDialogType | null
  setOpen: (value: AdjustmentDialogType | null) => void
  currentRow: AdjustmentListItem | null
  setCurrentRow: (row: AdjustmentListItem | null) => void
}

const AdjustmentsContext = createContext<AdjustmentsContextValue | null>(null)

export function AdjustmentsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<AdjustmentDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<AdjustmentListItem | null>(null)

  return (
    <AdjustmentsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </AdjustmentsContext.Provider>
  )
}

export function useAdjustmentsContext(): AdjustmentsContextValue {
  const context = useContext(AdjustmentsContext)
  if (!context) {
    throw new Error(
      'useAdjustmentsContext must be used within an AdjustmentsProvider'
    )
  }
  return context
}
