import React, { createContext, useContext, useState } from 'react'
import {
  type City,
  useCities,
  useCreateCity,
  useUpdateCity,
  useDeleteCity,
} from '../hooks/use-cities'

interface CitiesContextType {
  cities: City[] | undefined
  isLoading: boolean
  isError: boolean
  createCity: any
  updateCity: any
  deleteCity: any
  searchTerm: string
  setSearchTerm: (term: string) => void
}

const CitiesContext = createContext<CitiesContextType | undefined>(undefined)

export const CitiesDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { data: cities, isLoading, isError } = useCities()
  const createCity = useCreateCity()
  const updateCity = useUpdateCity()
  const deleteCity = useDeleteCity()
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <CitiesContext.Provider
      value={{
        cities,
        isLoading,
        isError,
        createCity,
        updateCity,
        deleteCity,
        searchTerm,
        setSearchTerm,
      }}
    >
      {children}
    </CitiesContext.Provider>
  )
}

export const useCitiesData = () => {
  const context = useContext(CitiesContext)
  if (context === undefined) {
    throw new Error('useCitiesData must be used within a CitiesDataProvider')
  }
  return context
}
