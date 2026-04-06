import React from 'react'
import useCheckActiveNav from '@/hooks/use-check-active-nav'

export type StoreDialogType = 'create' | 'edit' | 'delete'

interface StoresContextType {
  open: StoreDialogType | null
  setOpen: (open: StoreDialogType | null) => void
  currentRow: any | null
  setCurrentRow: (row: any | null) => void
}

const StoresContext = React.createContext<StoresContextType | null>(null)

export function StoresProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState<StoreDialogType | null>(null)
  const [currentRow, setCurrentRow] = React.useState<any | null>(null)

  return (
    <StoresContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
      }}
    >
      {children}
    </StoresContext.Provider>
  )
}

export const useStoresContext = () => {
  const context = React.useContext(StoresContext)
  if (!context) {
    throw new Error('useStoresContext must be used within a StoresProvider')
  }
  return context
}
