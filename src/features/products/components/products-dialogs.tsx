'use client'

import { ProductActionDialog } from './product-action-dialog'
import { ProductDeleteDialog } from './product-delete-dialog'
import { ProductViewDialog } from './product-view-dialog'
import { ProductWizardDialog } from './product-wizard-dialog'
import { useProductsContext } from './products-provider'

export function ProductsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useProductsContext()

  const currentId = currentRow?.id || (currentRow?.product_id ? String(currentRow.product_id) : 'new')

  return (
    <>
      <ProductWizardDialog key='product-wizard' />

      {/* Standalone Add Dialog if triggered outside wizard */}
      <ProductActionDialog
        key='product-add-dialog'
        open={open === 'add'}
        onOpenChange={(v: boolean) => {
          setOpen(v ? 'add' : null)
          if (!v) {
            setTimeout(() => setCurrentRow(null), 300)
          }
        }}
        currentRow={null}
      />

      {currentRow && (
        <>
          <ProductViewDialog
            key={`product-view-${currentId}`}
            open={open === 'view'}
            onOpenChange={(v: boolean) => {
              setOpen(v ? 'view' : null)
              if (!v) {
                setTimeout(() => setCurrentRow(null), 300)
              }
            }}
            currentRow={currentRow}
          />
          <ProductActionDialog
            key={`product-edit-${currentId}`}
            open={open === 'edit'}
            onOpenChange={(v: boolean) => {
              setOpen(v ? 'edit' : null)
              if (!v) {
                setTimeout(() => setCurrentRow(null), 300)
              }
            }}
            currentRow={currentRow}
          />

          <ProductDeleteDialog
            key={`product-delete-${currentId}`}
            open={open === 'delete'}
            onOpenChange={(v: boolean) => {
              setOpen(v ? 'delete' : null)
              if (!v) {
                setTimeout(() => setCurrentRow(null), 300)
              }
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
