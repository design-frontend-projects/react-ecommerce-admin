import React, { createContext, useContext, useState } from 'react'
import {
  type Country,
  useCountries,
  useCreateCountry,
  useUpdateCountry,
  useDeleteCountry,
} from '../hooks/use-countries'

interface CountriesContextType {
  countries: Country[] | undefined
  isLoading: boolean
  isError: boolean
  createCountry: any
  updateCountry: any
  deleteCountry: any
  searchTerm: string
  setSearchTerm: (term: string) => void
}

const CountriesContext = createContext<CountriesContextType | undefined>(
  undefined
)

export const CountriesDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { data: countries, isLoading, isError } = useCountries()
  const createCountry = useCreateCountry()
  const updateCountry = useUpdateCountry()
  const deleteCountry = useDeleteCountry()
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <CountriesContext.Provider
      value={{
        countries,
        isLoading,
        isError,
        createCountry,
        updateCountry,
        deleteCountry,
        searchTerm,
        setSearchTerm,
      }}
    >
      {children}
    </CountriesContext.Provider>
  )
}

export const useCountriesData = () => {
  const context = useContext(CountriesContext)
  if (context === undefined) {
    throw new Error(
      'useCountriesData must be used within a CountriesDataProvider'
    )
  }
  return context
}
