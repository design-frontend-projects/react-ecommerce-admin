import { createContext, useContext, useState, type ReactNode } from 'react'
import type { CountListItem } from '../data/schema'

export type CountDialogType = 'create' | 'view'

interface CountsContextValue {
  open: CountDialogType | null
  setOpen: (value: CountDialogType | null) => void
  currentRow: CountListItem | null
  setCurrentRow: (row: CountListItem | null) => void
}

const CountsContext = createContext<CountsContextValue | null>(null)

export function CountsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<CountDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<CountListItem | null>(null)

  return (
    <CountsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </CountsContext.Provider>
  )
}

export function useCountsContext(): CountsContextValue {
  const context = useContext(CountsContext)
  if (!context) {
    throw new Error('useCountsContext must be used within a CountsProvider')
  }
  return context
}
