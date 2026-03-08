import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type TransactionRow } from '../data/schema'

type TransactionsDialogType = 'add' | 'view'

interface TransactionsContextType {
  open: TransactionsDialogType | null
  setOpen: (str: TransactionsDialogType | null) => void
  currentRow: TransactionRow | null
  setCurrentRow: React.Dispatch<React.SetStateAction<TransactionRow | null>>
}

const TransactionsContext = React.createContext<TransactionsContextType | null>(
  null
)

interface Props {
  children: React.ReactNode
}

export function TransactionsProvider({ children }: Props) {
  const [open, setOpen] = useDialogState<TransactionsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<TransactionRow | null>(null)

  return (
    <TransactionsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </TransactionsContext.Provider>
  )
}

export const useTransactionsContext = () => {
  const context = React.useContext(TransactionsContext)
  if (!context) {
    throw new Error(
      'useTransactionsContext must be used within <TransactionsProvider>'
    )
  }
  return context
}
