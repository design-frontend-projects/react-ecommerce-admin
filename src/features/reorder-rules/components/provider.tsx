import { createContext, useContext, useState, type ReactNode } from 'react'
import type { RuleListItem } from '../data/schema'

export type RuleDialogType = 'create' | 'edit' | 'delete'

interface ReorderRulesContextValue {
  open: RuleDialogType | null
  setOpen: (value: RuleDialogType | null) => void
  currentRow: RuleListItem | null
  setCurrentRow: (row: RuleListItem | null) => void
}

const ReorderRulesContext = createContext<ReorderRulesContextValue | null>(null)

export function ReorderRulesProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<RuleDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<RuleListItem | null>(null)

  return (
    <ReorderRulesContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </ReorderRulesContext.Provider>
  )
}

export function useReorderRulesContext(): ReorderRulesContextValue {
  const context = useContext(ReorderRulesContext)
  if (!context) {
    throw new Error(
      'useReorderRulesContext must be used within a ReorderRulesProvider'
    )
  }
  return context
}
