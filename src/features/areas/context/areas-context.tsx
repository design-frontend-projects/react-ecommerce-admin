import React, { createContext, useContext, useState } from 'react'
import { type Area } from '../data/schema'

type OpenDialogType = 'add' | 'edit' | 'delete'

interface AreasContextType {
  open: OpenDialogType | null
  setOpen: (open: OpenDialogType | null) => void
  currentRow: Area | null
  setCurrentRow: (row: Area | null) => void
}

const AreasContext = createContext<AreasContextType | undefined>(undefined)

export function AreasProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<OpenDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<Area | null>(null)

  return (
    <AreasContext.Provider value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </AreasContext.Provider>
  )
}

export const useAreasContext = () => {
  const context = useContext(AreasContext)
  if (!context) {
    throw new Error('useAreasContext must be used within AreasProvider')
  }
  return context
}
