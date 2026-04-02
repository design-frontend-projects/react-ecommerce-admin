import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import type { StockBalanceRow, StockBalanceDialogType } from '../data/schema'

interface StockBalancesContextType {
  open: StockBalanceDialogType | null
  setOpen: (str: StockBalanceDialogType | null) => void
  currentRow: StockBalanceRow | null
  setCurrentRow: React.Dispatch<React.SetStateAction<StockBalanceRow | null>>
}

const StockBalancesContext =
  React.createContext<StockBalancesContextType | null>(null)

interface Props {
  children: React.ReactNode
}

export function StockBalancesProvider({ children }: Props) {
  const [open, setOpen] = useDialogState<StockBalanceDialogType>(null)
  const [currentRow, setCurrentRow] = useState<StockBalanceRow | null>(null)

  return (
    <StockBalancesContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </StockBalancesContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useStockBalancesContext = () => {
  const context = React.useContext(StockBalancesContext)

  if (!context) {
    throw new Error(
      'useStockBalancesContext must be used within <StockBalancesProvider>'
    )
  }

  return context
}
