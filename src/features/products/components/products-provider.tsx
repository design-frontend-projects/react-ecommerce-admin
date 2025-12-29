import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { type Product } from '../data/schema'

type ProductsDialogType = 'add' | 'edit' | 'delete'

interface ProductsContextType {
  open: ProductsDialogType | null
  setOpen: (str: ProductsDialogType | null) => void
  currentRow: Product | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Product | null>>
}

const ProductsContext = React.createContext<ProductsContextType | null>(null)

interface Props {
  children: React.ReactNode
}

export function ProductsProvider({ children }: Props) {
  const [open, setOpen] = useDialogState<ProductsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Product | null>(null)

  return (
    <ProductsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
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
