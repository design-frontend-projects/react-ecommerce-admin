import React, { createContext, useContext, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
  createCity: ReturnType<typeof useCreateCity>
  updateCity: ReturnType<typeof useUpdateCity>
  deleteCity: ReturnType<typeof useDeleteCity>
  searchTerm: string
  setSearchTerm: (term: string) => void
  navigate: ReturnType<typeof useNavigate>
}

const CitiesContext = createContext<CitiesContextType | undefined>(undefined)

export const CitiesDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate()
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
        navigate,
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
