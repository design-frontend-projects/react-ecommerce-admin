import React, { useState, createContext, useContext } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Country } from '../data/schema'

type CountriesDialogType = 'add' | 'edit' | 'delete'

interface CountriesContextType {
  open: CountriesDialogType | null
  setOpen: (str: CountriesDialogType | null) => void
  currentRow: Country | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Country | null>>
}

const CountriesContext = createContext<CountriesContextType | null>(null)

export function CountriesDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<CountriesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Country | null>(null)

  return (
    <CountriesContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </CountriesContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCountriesDialog = () => {
  const context = useContext(CountriesContext)
  if (!context) {
    throw new Error('useCountriesDialog must be used within a CountriesDialogProvider')
  }
  return context
}
