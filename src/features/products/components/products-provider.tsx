import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Product } from '../data/schema'

export type ProductQuickFilter =
  | 'all'
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'inactive'

type ProductsDialogType = 'add' | 'edit' | 'delete' | 'view'

interface ProductsContextType {
  open: ProductsDialogType | null
  setOpen: (str: ProductsDialogType | null) => void
  currentRow: Product | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Product | null>>
  quickFilter: ProductQuickFilter | null
  setQuickFilter: (filter: ProductQuickFilter | null) => void
}

const ProductsContext = React.createContext<ProductsContextType | null>(null)

interface Props {
  children: React.ReactNode
}

export function ProductsProvider({ children }: Props) {
  const [open, setOpen] = useDialogState<ProductsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Product | null>(null)
  const [quickFilter, setQuickFilter] = useState<ProductQuickFilter | null>(null)

  return (
    <ProductsContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        quickFilter,
        setQuickFilter,
      }}
    >
      {children}
    </ProductsContext.Provider>
  )
}

export const useProductsContext = () => {
  const productsContext = React.useContext(ProductsContext)

  if (!productsContext) {
    throw new Error('useProductsContext must be used within <ProductsProvider>')
  }

  return productsContext
}
