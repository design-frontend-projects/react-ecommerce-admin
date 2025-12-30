'use client'

import { InventoryActionDialog } from './inventory-action-dialog'
import { InventoryDeleteDialog } from './inventory-delete-dialog'
import { useInventoryContext } from './inventory-provider'

export function InventoryDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useInventoryContext()

  return (
    <>
      <InventoryActionDialog
        key='inventory-add'
        open={open === 'add'}
        onOpenChange={(v) => {
          setOpen(v ? 'add' : null)
          if (!v) setCurrentRow(null)
        }}
      />

      {currentRow && (
        <>
          <InventoryActionDialog
            key={`inventory-edit-${currentRow.inventory_id}`}
            open={open === 'edit'}
            onOpenChange={(v) => {
              setOpen(v ? 'edit' : null)
              if (!v) {
                setTimeout(() => setCurrentRow(null), 500)
              }
            }}
            currentRow={currentRow}
          />

          <InventoryDeleteDialog
            key={`inventory-delete-${currentRow.inventory_id}`}
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
