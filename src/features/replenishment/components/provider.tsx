import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { RowSelectionState } from '@tanstack/react-table'

interface ReplenishmentContextValue {
  rowSelection: RowSelectionState
  setRowSelection: Dispatch<SetStateAction<RowSelectionState>>
  selectedIds: string[]
}

const ReplenishmentContext = createContext<ReplenishmentContextValue | null>(
  null
)

export function ReplenishmentProvider({ children }: { children: ReactNode }) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
    [rowSelection]
  )

  return (
    <ReplenishmentContext.Provider
      value={{ rowSelection, setRowSelection, selectedIds }}
    >
      {children}
    </ReplenishmentContext.Provider>
  )
}

export function useReplenishmentContext(): ReplenishmentContextValue {
  const context = useContext(ReplenishmentContext)
  if (!context) {
    throw new Error(
      'useReplenishmentContext must be used within a ReplenishmentProvider'
    )
  }
  return context
}
