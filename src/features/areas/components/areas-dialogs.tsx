import { useAreasDialog } from './areas-provider'
import { AreasActionDialog } from './areas-action-dialog'
import { AreasDeleteDialog } from './areas-delete-dialog'

export function AreasDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useAreasDialog()

  return (
    <>
      <AreasActionDialog
        key={`area-add-${open === 'add'}`}
        open={open === 'add'}
        onOpenChange={() => setOpen(null)}
      />

      {currentRow && (
        <>
          <AreasActionDialog
            key={`area-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen(null)
              setTimeout(() => setCurrentRow(null), 500)
            }}
            currentRow={currentRow}
          />
          <AreasDeleteDialog
            key={`area-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen(null)
              setTimeout(() => setCurrentRow(null), 500)
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
