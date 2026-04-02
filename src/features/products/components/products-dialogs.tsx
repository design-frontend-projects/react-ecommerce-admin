'use client'

import { ProductActionDialog } from './product-action-dialog'
import { ProductViewDialog } from './product-view-dialog'
import { ProductDeleteDialog } from './product-delete-dialog'
import { useProductsContext } from './products-provider'
import { ProductWizardDialog } from './product-wizard-dialog'

export function ProductsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useProductsContext()

  return (
    <>
      <ProductWizardDialog key="product-wizard" />


      {currentRow && (
        <>
          <ProductViewDialog
            key={`product-view-${currentRow.product_id}`}
            open={open === 'view'}
            onOpenChange={(v: boolean) => {
              setOpen(v ? 'view' : null)
              if (!v) {
                setTimeout(() => setCurrentRow(null), 500)
              }
            }}
            currentRow={currentRow}
          />
          <ProductActionDialog
            key={`product-edit-${currentRow.product_id}`}
            open={open === 'edit'}
            onOpenChange={(v: boolean) => {
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
            onOpenChange={(v: boolean) => {
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
