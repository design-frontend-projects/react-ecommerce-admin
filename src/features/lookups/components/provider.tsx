import * as React from 'react'
import type { LookupTypeItem, LookupValueItem } from '../data/schema'

interface LookupsContextType {
  selectedType: LookupTypeItem | null
  setSelectedType: (type: LookupTypeItem | null) => void
  isCreateOpen: boolean
  setIsCreateOpen: (open: boolean) => void
  editingValue: LookupValueItem | null
  setEditingValue: (value: LookupValueItem | null) => void
  isSubmitting: boolean
  setIsSubmitting: (submitting: boolean) => void
}

const LookupsContext = React.createContext<LookupsContextType | undefined>(undefined)

export function LookupsProvider({ children }: { children: React.ReactNode }) {
  const [selectedType, setSelectedType] = React.useState<LookupTypeItem | null>(null)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingValue, setEditingValue] = React.useState<LookupValueItem | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  return (
    <LookupsContext.Provider
      value={{
        selectedType,
        setSelectedType,
        isCreateOpen,
        setIsCreateOpen,
        editingValue,
        setEditingValue,
        isSubmitting,
        setIsSubmitting,
      }}
    >
      {children}
    </LookupsContext.Provider>
  )
}

export function useLookupsContext() {
  const context = React.useContext(LookupsContext)
  if (!context) {
    throw new Error('useLookupsContext must be used within a LookupsProvider')
  }
  return context
}
