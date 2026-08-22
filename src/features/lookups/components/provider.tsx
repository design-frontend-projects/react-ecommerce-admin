import * as React from 'react'
import type {
  LookupTypeItem,
  LookupValueItem,
  LookupTypeTreeNode,
  TreeLookupValueNode,
} from '../data/schema'

export type ViewMode = 'tree' | 'graph' | 'split' | 'matrix'

export interface InspectorNode {
  type: 'type' | 'value'
  data: LookupTypeTreeNode | TreeLookupValueNode | LookupTypeItem | LookupValueItem
}

interface LookupsContextType {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  selectedType: LookupTypeItem | LookupTypeTreeNode | null
  setSelectedType: (type: LookupTypeItem | LookupTypeTreeNode | null) => void
  isCreateOpen: boolean
  setIsCreateOpen: (open: boolean) => void
  isCreateTypeOpen: boolean
  setIsCreateTypeOpen: (open: boolean) => void
  editingValue: LookupValueItem | TreeLookupValueNode | null
  setEditingValue: (value: LookupValueItem | TreeLookupValueNode | null) => void
  parentValueForCreate: string | null
  setParentValueForCreate: (parentId: string | null) => void
  selectedInspectorNode: InspectorNode | null
  setSelectedInspectorNode: (node: InspectorNode | null) => void
  isInspectorOpen: boolean
  setIsInspectorOpen: (open: boolean) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  domainFilter: string
  setDomainFilter: (domain: string) => void
  isSubmitting: boolean
  setIsSubmitting: (submitting: boolean) => void
}

const LookupsContext = React.createContext<LookupsContextType | undefined>(undefined)

export function LookupsProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('tree')
  const [selectedType, setSelectedType] = React.useState<
    LookupTypeItem | LookupTypeTreeNode | null
  >(null)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isCreateTypeOpen, setIsCreateTypeOpen] = React.useState(false)
  const [editingValue, setEditingValue] = React.useState<
    LookupValueItem | TreeLookupValueNode | null
  >(null)
  const [parentValueForCreate, setParentValueForCreate] = React.useState<string | null>(null)
  const [selectedInspectorNode, setSelectedInspectorNode] = React.useState<InspectorNode | null>(null)
  const [isInspectorOpen, setIsInspectorOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [domainFilter, setDomainFilter] = React.useState('all')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  return (
    <LookupsContext.Provider
      value={{
        viewMode,
        setViewMode,
        selectedType,
        setSelectedType,
        isCreateOpen,
        setIsCreateOpen,
        isCreateTypeOpen,
        setIsCreateTypeOpen,
        editingValue,
        setEditingValue,
        parentValueForCreate,
        setParentValueForCreate,
        selectedInspectorNode,
        setSelectedInspectorNode,
        isInspectorOpen,
        setIsInspectorOpen,
        searchQuery,
        setSearchQuery,
        domainFilter,
        setDomainFilter,
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
