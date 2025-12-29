'use client'

import { ProductActionDialog } from './product-action-dialog'
import { ProductDeleteDialog } from './product-delete-dialog'
import { useProductsContext } from './products-provider'

export function ProductsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useProductsContext()

  return (
    <>
      <ProductActionDialog
        key='product-add'
        open={open === 'add'}
        onOpenChange={(v) => {
          setOpen(v ? 'add' : null)
          if (!v) setCurrentRow(null)
        }}
      />

      {currentRow && (
        <>
          <ProductActionDialog
            key={`product-edit-${currentRow.product_id}`}
            open={open === 'edit'}
            onOpenChange={(v) => {
              setOpen(v ? 'edit' : null)
              if (!v) {
                setTimeout(() => setCurrentRow(null), 500)
              }
            }}
            currentRow={currentRow}
          />

          <ProductDeleteDialog
            key={`product-delete-${currentRow.product_id}`}
            open={open === 'delete'}
            onOpenChange={(v) => {
              setOpen(v ? 'delete' : null)
              if (!v) {
                setTimeout(() => setCurrentRow(null), 500)
              }
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
