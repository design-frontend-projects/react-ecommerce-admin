import { createContext, useContext, useState, type ReactNode } from 'react'
import type { OrderListItem } from '../data/schema'

export type OrderDialogType = 'create' | 'view'

interface OrdersContextValue {
  open: OrderDialogType | null
  setOpen: (value: OrderDialogType | null) => void
  currentRow: OrderListItem | null
  setCurrentRow: (row: OrderListItem | null) => void
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<OrderDialogType | null>(null)
  const [currentRow, setCurrentRow] = useState<OrderListItem | null>(null)

  return (
    <OrdersContext.Provider value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrdersContext(): OrdersContextValue {
  const context = useContext(OrdersContext)
  if (!context) {
    throw new Error('useOrdersContext must be used within an OrdersProvider')
  }
  return context
}
