import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type City } from '../data/schema'

type CitiesDialogType = 'add' | 'edit' | 'delete' | 'import'

type CitiesDialogContextType = {
  open: CitiesDialogType | null
  setOpen: (str: CitiesDialogType | null) => void
  currentRow: City | null
  setCurrentRow: React.Dispatch<React.SetStateAction<City | null>>
}

const CitiesDialogContext = React.createContext<CitiesDialogContextType | null>(null)

export function CitiesDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<CitiesDialogType>(null)
  const [currentRow, setCurrentRow] = useState<City | null>(null)

  return (
    <CitiesDialogContext.Provider value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </CitiesDialogContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCitiesDialog = () => {
  const context = React.useContext(CitiesDialogContext)
  if (!context) {
    throw new Error('useCitiesDialog must be used within <CitiesDialogProvider>')
  }
  return context
}

// Alias for backward compatibility with components using useCitiesContext
export const useCitiesContext = useCitiesDialog
