import { createContext, useContext, useState, type ReactNode } from 'react'
import type { RequisitionListItem } from '../data/schema'

export type RequisitionDialogType = 'create' | 'view'

interface RequisitionsContextValue {
  open: RequisitionDialogType | null
  setOpen: (value: RequisitionDialogType | null) => void
  currentRow: RequisitionListItem | null
  setCurrentRow: (row: RequisitionListItem | null) => void
}

const RequisitionsContext = createContext<RequisitionsContextValue | null>(
  null
)

export function RequisitionsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<RequisitionDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<RequisitionListItem | null>(
    null
  )

  return (
    <RequisitionsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </RequisitionsContext.Provider>
  )
}

export function useRequisitionsContext(): RequisitionsContextValue {
  const context = useContext(RequisitionsContext)
  if (!context) {
    throw new Error(
      'useRequisitionsContext must be used within a RequisitionsProvider'
    )
  }
  return context
}
