import React, { useState, createContext, useContext } from 'react'
import { type Country } from '../data/schema'

type CountriesDialogType = 'add' | 'edit' | 'delete'

interface CountriesContextType {
  open: CountriesDialogType | null
  setOpen: (str: CountriesDialogType | null) => void
  currentRow: Country | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Country | null>>
}

const CountriesContext = createContext<CountriesContextType | null>(null)

export function CountriesProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<CountriesDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<Country | null>(null)

  return (
    <CountriesContext.Provider value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </CountriesContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCountriesDialog = () => {
  const context = useContext(CountriesContext)
  if (!context) {
    throw new Error('useCountriesDialog must be used within a CountriesProvider')
  }
  return context
}
