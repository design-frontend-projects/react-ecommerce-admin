import { createContext, useContext, useState } from 'react'
import { Currency } from '../hooks/use-currencies'

interface CurrenciesContextType {
  open: 'create' | 'update' | 'delete' | null
  setOpen: (open: 'create' | 'update' | 'delete' | null) => void
  currentRow: Currency | null
  setCurrentRow: (row: Currency | null) => void
}

const CurrenciesContext = createContext<CurrenciesContextType | null>(null)

export function CurrenciesProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<'create' | 'update' | 'delete' | null>(null)
  const [currentRow, setCurrentRow] = useState<Currency | null>(null)

  return (
    <CurrenciesContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </CurrenciesContext.Provider>
  )
}

export const useCurrenciesContext = () => {
  const context = useContext(CurrenciesContext)
  if (!context) {
    throw new Error('useCurrenciesContext must be used within <CurrenciesProvider>')
  }
  return context
}
