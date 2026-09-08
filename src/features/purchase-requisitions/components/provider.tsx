import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { RequisitionListItem } from '../data/schema'

export type RequisitionDialogType =
  | 'create'
  | 'edit'
  | 'delete'
  | 'view'
  | null

interface RequisitionsContextValue {
  open: RequisitionDialogType
  setOpen: (value: RequisitionDialogType) => void
  currentRow: RequisitionListItem | null
  setCurrentRow: (row: RequisitionListItem | null) => void
}

const RequisitionsContext = createContext<RequisitionsContextValue | null>(null)

export function RequisitionsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<RequisitionDialogType>(null)
  const [currentRow, setCurrentRow] = useState<RequisitionListItem | null>(null)

  const handleSetOpen = useCallback((type: RequisitionDialogType) => {
    setOpen(type)
    if (type === null) {
      setCurrentRow(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      open,
      setOpen: handleSetOpen,
      currentRow,
      setCurrentRow,
    }),
    [open, currentRow, handleSetOpen]
  )

  return (
    <RequisitionsContext.Provider value={value}>
      {children}
    </RequisitionsContext.Provider>
  )
}

export function useRequisitionsContext(): RequisitionsContextValue {
  const context = useContext(RequisitionsContext)
  if (!context) {
    throw new Error(
      'useRequisitionsContext must be used within a RequisitionsProvider'
    )
  }
  return context
}
