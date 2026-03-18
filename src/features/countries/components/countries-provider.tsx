import React, { useState, useCallback, useMemo } from 'react'
import { type Country } from '../hooks/use-countries'

type CountriesDialogType = 'create' | 'edit' | 'delete' | null

interface CountriesContextType {
  open: CountriesDialogType
  setOpen: (type: CountriesDialogType) => void
  currentRow: Country | null
  setCurrentRow: (row: Country | null) => void
}

const CountriesContext = React.createContext<CountriesContextType | null>(
  null
)

interface CountriesProviderProps {
  children: React.ReactNode
}

export function CountriesProvider({ children }: CountriesProviderProps) {
  const [open, setOpen] = useState<CountriesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Country | null>(null)

  const handleSetOpen = useCallback((type: CountriesDialogType) => {
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
    <CountriesContext.Provider value={value}>
      {children}
    </CountriesContext.Provider>
  )
}

export const useCountriesContext = () => {
  const context = React.useContext(CountriesContext)

  if (!context) {
    throw new Error(
      'useCountriesContext must be used within <CountriesProvider>'
    )
  }

  return context
}
