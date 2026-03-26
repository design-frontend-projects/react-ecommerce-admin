import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Area } from '../data/schema'

type AreasDialogType = 'add' | 'edit' | 'delete' | 'import'

type AreasDialogContextType = {
  open: AreasDialogType | null
  setOpen: (str: AreasDialogType | null) => void
  currentRow: Area | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Area | null>>
}

const AreasDialogContext = React.createContext<AreasDialogContextType | null>(null)

export function AreasDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<AreasDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Area | null>(null)

  return (
    <AreasDialogContext.Provider value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </AreasDialogContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAreasDialog = () => {
  const context = React.useContext(AreasDialogContext)
  if (!context) {
    throw new Error('useAreasDialog must be used within <AreasDialogProvider>')
  }
  return context
}

export const useAreasContext = useAreasDialog
