import React, { createContext, useContext, useState } from 'react'
import { type UseNavigateResult, useNavigate } from '@tanstack/react-router'
import { type UseMutationResult } from '@tanstack/react-query'
import { type Country } from '../data/schema'
import {
  type CountryInput,
  useCountries,
  useCreateCountry,
  useUpdateCountry,
  useDeleteCountry,
} from '../hooks/use-countries'

interface CountriesContextType {
  countries: Country[] | undefined
  isLoading: boolean
  isError: boolean
  createCountry: UseMutationResult<Country, Error, CountryInput>
  updateCountry: UseMutationResult<Country, Error, CountryInput & { id: number }>
  deleteCountry: UseMutationResult<void, Error, number>
  searchTerm: string
  setSearchTerm: (term: string) => void
  navigate: UseNavigateResult<string>
}

const CountriesContext = createContext<CountriesContextType | undefined>(
  undefined
)

export const CountriesDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate()
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
        navigate,
      }}
    >
      {children}
    </CountriesContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCountriesData = () => {
  const context = useContext(CountriesContext)
  if (context === undefined) {
    throw new Error(
      'useCountriesData must be used within a CountriesDataProvider'
    )
  }
  return context
}
