import React, { useState, useCallback, useMemo } from 'react'
import { type Branch } from '../hooks/use-branches'

type BranchesDialogType = 'create' | 'edit' | 'delete' | null

interface BranchesContextType {
  open: BranchesDialogType
  setOpen: (type: BranchesDialogType) => void
  currentRow: Branch | null
  setCurrentRow: (row: Branch | null) => void
}

const BranchesContext = React.createContext<BranchesContextType | null>(null)

interface BranchesProviderProps {
  children: React.ReactNode
}

export function BranchesProvider({ children }: BranchesProviderProps) {
  const [open, setOpen] = useState<BranchesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Branch | null>(null)

  const handleSetOpen = useCallback((type: BranchesDialogType) => {
    setOpen(type)
    if (type === null) {
      setCurrentRow(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      open,
      setOpen: handleSetOpen,
      currentRow,
      setCurrentRow,
    }),
    [open, currentRow, handleSetOpen]
  )

  return (
    <BranchesContext.Provider value={value}>
      {children}
    </BranchesContext.Provider>
  )
}

export const useBranchesContext = () => {
  const context = React.useContext(BranchesContext)

  if (!context) {
    throw new Error(
      'useBranchesContext must be used within <BranchesProvider>'
    )
  }

  return context
}
