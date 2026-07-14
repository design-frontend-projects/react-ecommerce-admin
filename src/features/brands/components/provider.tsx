import { createContext, useContext, useState, type ReactNode } from 'react'
import type { BrandListItem } from '../data/schema'

export type BrandDialogType = 'create' | 'edit' | 'delete'

interface BrandsContextValue {
  open: BrandDialogType | null
  setOpen: (value: BrandDialogType | null) => void
  currentRow: BrandListItem | null
  setCurrentRow: (row: BrandListItem | null) => void
}

const BrandsContext = createContext<BrandsContextValue | null>(null)

export function BrandsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<BrandDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<BrandListItem | null>(null)

  return (
    <BrandsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </BrandsContext.Provider>
  )
}

export function useBrandsContext(): BrandsContextValue {
  const context = useContext(BrandsContext)
  if (!context) {
    throw new Error('useBrandsContext must be used within a BrandsProvider')
  }
  return context
}
