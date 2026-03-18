import { createContext, useContext, useState } from 'react'
import { City } from '../hooks/use-cities'

interface CitiesContextType {
  open: (action: 'create' | 'update' | 'delete', city?: City) => void
  close: () => void
  isOpen: boolean
  action: 'create' | 'update' | 'delete' | null
  selectedCity: City | null
}

const CitiesContext = createContext<CitiesContextType | undefined>(undefined)

export function CitiesProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [action, setAction] = useState<'create' | 'update' | 'delete' | null>(null)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)

  const open = (action: 'create' | 'update' | 'delete', city?: City) => {
    setAction(action)
    setSelectedCity(city || null)
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setAction(null)
    setSelectedCity(null)
  }

  return (
    <CitiesContext.Provider
      value={{
        open,
        close,
        isOpen,
        action,
        selectedCity,
      }}
    >
      {children}
    </CitiesContext.Provider>
  )
}

export function useCitiesContext() {
  const context = useContext(CitiesContext)
  if (!context) {
    throw new Error('useCitiesContext must be used within a CitiesProvider')
  }
  return context
}
